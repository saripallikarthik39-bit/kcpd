import { db } from './database';
import type { KhataTransaction, LineItem } from '../types/store';

export interface KhataMutationInput {
  client_tx_id?: string;
  customer_id: number;
  type: 'credit' | 'payment';
  items: LineItem[];
  amount: number;
  payment_mode?: 'Cash' | 'UPI' | 'Khata';
}

export function generateClientTxId(): string {
  return `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function addKhataEntry(
  input: KhataMutationInput
): Promise<{ status: 'saved' | 'duplicate'; tx: KhataTransaction }> {
  const client_tx_id = input.client_tx_id ?? generateClientTxId();

  // Deduplicate by client_tx_id so retries never double-charge a customer
  const existing = await db.khata_transactions
    .where('client_tx_id')
    .equals(client_tx_id)
    .first();

  if (existing) {
    return { status: 'duplicate', tx: existing };
  }

  const now = new Date().toISOString();
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  const newTx: KhataTransaction = {
    client_tx_id,
    customer_id: input.customer_id,
    type: input.type,
    items: input.items,
    amount: input.amount,
    payment_mode: input.payment_mode,
    created_at: now,
    synced: isOnline,
  };

  await db.transaction(
    'rw',
    [db.customers, db.khata_transactions, db.products],
    async () => {
      const customer = await db.customers.get(input.customer_id);
      if (!customer) {
        throw new Error('Customer not found');
      }

      const delta = input.type === 'credit' ? input.amount : -input.amount;
      const nextBalance = Math.max(0, Number((customer.khata_balance + delta).toFixed(2)));

      await db.customers.update(input.customer_id, {
        khata_balance: nextBalance,
        updated_at: now,
      });

      // Deduct stock when credit items are added
      if (input.type === 'credit' && input.items.length > 0) {
        for (const item of input.items) {
          if (item.product_id) {
            const product = await db.products.get(item.product_id);
            if (product) {
              const nextStock = Math.max(0, Number((product.stock - item.qty).toFixed(3)));
              await db.products.update(item.product_id, { stock: nextStock });
            }
          }
        }
      }

      const id = await db.khata_transactions.add(newTx);
      newTx.id = id;
    }
  );

  return { status: 'saved', tx: newTx };
}

// Flush locally on reconnect with zero network fetches
export async function flushOfflineQueue(): Promise<number> {
  const unsynced = await db.khata_transactions
    .filter((tx) => !tx.synced)
    .toArray();

  if (unsynced.length === 0) return 0;

  await db.transaction('rw', db.khata_transactions, async () => {
    for (const tx of unsynced) {
      if (tx.id !== undefined) {
        await db.khata_transactions.update(tx.id, { synced: true });
      }
    }
  });

  return unsynced.length;
}

export async function getPendingQueueCount(): Promise<number> {
  return db.khata_transactions.filter((tx) => !tx.synced).count();
}