import Dexie, { type Table } from 'dexie';
import type {
  Product,
  Customer,
  KhataTransaction,
  UpiEvent,
  Bill,
} from '../types/store';

export class KiranaDB extends Dexie {
  products!: Table<Product>;
  customers!: Table<Customer>;
  khata_transactions!: Table<KhataTransaction>;
  upi_events!: Table<UpiEvent>;
  bills!: Table<Bill>;

  constructor() {
    super('KiranaCopilotDB');
    this.version(1).stores({
      products: '++id, name, *aliases, stock, expiry_date',
      customers: '++id, name, phone',
      khata_transactions: '++id, &client_tx_id, customer_id, synced, created_at',
      upi_events: '++id, sender, amount, status, received_at',
      bills: '++id, counter, created_at',
    });
  }
}

export const db = new KiranaDB();

export async function initDatabaseWithRecovery(seedFn: () => Promise<void>): Promise<void> {
  try {
    await db.open();
    const productCount = await db.products.count();
    if (productCount === 0) {
      await seedFn();
    }
  } catch (err: unknown) {
    const errorName = err instanceof Error ? err.name : '';
    if (errorName === 'UpgradeError' || errorName === 'VersionError') {
      await Dexie.delete('KiranaCopilotDB');
      await db.open();
      await seedFn();
    } else {
      throw err;
    }
  }
}