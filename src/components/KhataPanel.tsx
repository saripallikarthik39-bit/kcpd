import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { BookOpen, MessageSquare, PlusCircle, MinusCircle } from 'lucide-react';
import { db } from '../db/database';
import { addKhataEntry } from '../db/offlineQueue';
import type { Customer } from '../types/store';

function buildWhatsAppLink(customer: Customer): string {
  const message = `Namaste ${customer.name}, aapka pending kirana khata balance ₹${customer.khata_balance} hai. Suvidha anusar UPI ya cash se clear kar dijiyega. Dhanyavaad!`;
  return `https://wa.me/91${customer.phone}?text=${encodeURIComponent(message)}`;
}

export function KhataPanel() {
  const customers = useLiveQuery(() => db.customers.toArray(), []) ?? [];
  const recentTxs =
    useLiveQuery(
      () => db.khata_transactions.orderBy('created_at').reverse().limit(5).toArray(),
      []
    ) ?? [];

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [amountInput, setAmountInput] = useState<string>('');
  const [noteInput, setNoteInput] = useState<string>('');
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handleTransaction(type: 'credit' | 'payment') {
    setFeedback(null);
    const amount = parseFloat(amountInput);

    if (!selectedCustomerId) {
      setFeedback('Please select a customer.');
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      setFeedback('Enter a valid amount in ₹.');
      return;
    }

    const result = await addKhataEntry({
      customer_id: Number(selectedCustomerId),
      type,
      amount,
      items: noteInput.trim()
        ? [{ name: noteInput.trim(), qty: 1, unit: 'item', price: amount, subtotal: amount }]
        : [],
      payment_mode: type === 'payment' ? 'UPI' : 'Khata',
    });

    setAmountInput('');
    setNoteInput('');
    setFeedback(
      result.tx.synced
        ? `Saved ₹${amount} ${type === 'credit' ? 'credit' : 'payment'} locally.`
        : `Offline mode: ₹${amount} ${type} queued locally for sync.`
    );
  }

  return (
    <section className="rounded-xl border border-slate-800 bg-[#1E293B] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-slate-300" />
          <h2 className="text-base font-semibold text-white">Customer Khata</h2>
        </div>
        <span className="text-xs text-slate-400">
          {customers.length} active accounts
        </span>
      </div>

      {/* Customer Balances */}
      <div className="mb-4 space-y-2">
        {customers.map((customer) => (
          <div
            key={customer.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-700/80 bg-[#0F172A] px-3 py-2.5"
          >
            <div>
              <p className="text-sm font-semibold text-white">{customer.name}</p>
              <p className="font-mono-num text-[11px] text-slate-400">
                +91 {customer.phone}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span
                className={`font-mono-num text-base font-bold ${
                  customer.khata_balance > 0 ? 'text-[#F59E0B]' : 'text-[#10B981]'
                }`}
              >
                ₹{customer.khata_balance.toFixed(2)}
              </span>

              <a
                href={buildWhatsAppLink(customer)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#1E293B] px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:border-[#10B981] hover:text-[#10B981]"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>WhatsApp</span>
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Manual Khata Entry Form */}
      <div className="rounded-lg border border-slate-700/80 bg-[#0F172A] p-3">
        <p className="mb-2 text-xs font-semibold text-slate-300">
          Manual Khata Entry (Offline-Safe)
        </p>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <select
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className="rounded-lg border border-slate-700 bg-[#1E293B] px-2.5 py-2 text-xs text-slate-100 focus:outline-none"
          >
            <option value="">Select customer...</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} (₹{c.khata_balance})
              </option>
            ))}
          </select>

          <input
            type="number"
            min="1"
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
            placeholder="Amount (₹)"
            className="font-mono-num rounded-lg border border-slate-700 bg-[#1E293B] px-2.5 py-2 text-xs text-slate-100 focus:outline-none"
          />

          <input
            type="text"
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            placeholder="Note (e.g. 2kg sugar)"
            className="rounded-lg border border-slate-700 bg-[#1E293B] px-2.5 py-2 text-xs text-slate-100 focus:outline-none"
          />
        </div>

        <div className="mt-2.5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleTransaction('credit')}
            className="flex items-center gap-1.5 rounded-lg border border-[#F59E0B]/50 bg-[#F59E0B]/15 px-3 py-1.5 text-xs font-semibold text-[#F59E0B] hover:bg-[#F59E0B]/25"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>Add Credit (+Udhar)</span>
          </button>

          <button
            type="button"
            onClick={() => handleTransaction('payment')}
            className="flex items-center gap-1.5 rounded-lg border border-[#10B981]/50 bg-[#10B981]/15 px-3 py-1.5 text-xs font-semibold text-[#10B981] hover:bg-[#10B981]/25"
          >
            <MinusCircle className="h-3.5 w-3.5" />
            <span>Record Payment (-Jama)</span>
          </button>
        </div>

        {feedback && (
          <p className="mt-2 text-xs text-slate-300">{feedback}</p>
        )}
      </div>

      {/* Recent Khata Log */}
      {recentTxs.length > 0 && (
        <div className="mt-3 border-t border-slate-800 pt-2.5">
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-400">
            Recent Entries
          </p>
          <ul className="space-y-1">
            {recentTxs.map((tx) => {
              const cust = customers.find((c) => c.id === tx.customer_id);
              return (
                <li
                  key={tx.id}
                  className="flex items-center justify-between text-xs text-slate-300"
                >
                  <span>
                    {cust?.name ?? `Customer #${tx.customer_id}`} —{' '}
                    {tx.type === 'credit' ? 'Credit' : 'Payment'}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono-num font-semibold">
                      {tx.type === 'credit' ? '+' : '-'}₹{tx.amount}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] ${
                        tx.synced
                          ? 'bg-[#10B981]/15 text-[#10B981]'
                          : 'bg-[#F59E0B]/15 text-[#F59E0B]'
                      }`}
                    >
                      {tx.synced ? 'Synced' : 'Queued'}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}