import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Receipt, Plus, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { db } from '../db/database';
import { addKhataEntry } from '../db/offlineQueue';
import type { LineItem } from '../types/store';

export function QuickBillPanel() {
  const products = useLiveQuery(() => db.products.toArray(), []) ?? [];
  const customers = useLiveQuery(() => db.customers.toArray(), []) ?? [];

  const [activeCounter, setActiveCounter] = useState<'A' | 'B'>('A');
  const [baskets, setBaskets] = useState<{ A: LineItem[]; B: LineItem[] }>({
    A: [],
    B: [],
  });

  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [qtyInput, setQtyInput] = useState<string>('1');
  const [khataCustomerId, setKhataCustomerId] = useState<string>('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'ok' | 'warn'; text: string } | null>(null);

  const currentItems = baskets[activeCounter];
  const total = Number(
    currentItems.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2)
  );

  function handleAddItem() {
    setStatusMsg(null);
    const product = products.find((p) => String(p.id) === selectedProductId);
    const qty = parseFloat(qtyInput);

    if (!product || !product.id) {
      setStatusMsg({ type: 'warn', text: 'Select a product first.' });
      return;
    }
    if (isNaN(qty) || qty <= 0) {
      setStatusMsg({ type: 'warn', text: 'Enter a valid quantity (e.g. 0.25, 0.5, 1).' });
      return;
    }
    if (qty > product.stock) {
      setStatusMsg({
        type: 'warn',
        text: `Only ${product.stock} ${product.unit} of ${product.name} left in stock.`,
      });
      return;
    }

    const subtotal = Number((product.selling_price * qty).toFixed(2));
    const newItem: LineItem = {
      product_id: product.id,
      name: product.name,
      qty,
      unit: product.unit,
      price: product.selling_price,
      subtotal,
    };

    setBaskets((prev) => ({
      ...prev,
      [activeCounter]: [...prev[activeCounter], newItem],
    }));
    setQtyInput('1');
  }

  function handleRemoveItem(index: number) {
    setBaskets((prev) => ({
      ...prev,
      [activeCounter]: prev[activeCounter].filter((_, i) => i !== index),
    }));
  }

  async function handleSettle(mode: 'Cash' | 'UPI' | 'Khata') {
    if (currentItems.length === 0) return;
    setStatusMsg(null);

    if (mode === 'Khata' && !khataCustomerId) {
      setStatusMsg({ type: 'warn', text: 'Select a Khata customer before settling to Khata.' });
      return;
    }

    const now = new Date().toISOString();
    const lowStockWarnings: string[] = [];

    if (mode === 'Khata') {
      await addKhataEntry({
        customer_id: Number(khataCustomerId),
        type: 'credit',
        items: currentItems,
        amount: total,
        payment_mode: 'Khata',
      });
    } else {
      await db.transaction('rw', [db.bills, db.products], async () => {
        await db.bills.add({
          counter: activeCounter,
          items: currentItems,
          total,
          payment_mode: mode,
          created_at: now,
        });

        for (const item of currentItems) {
          if (item.product_id) {
            const prod = await db.products.get(item.product_id);
            if (prod) {
              const nextStock = Math.max(0, Number((prod.stock - item.qty).toFixed(3)));
              await db.products.update(item.product_id, { stock: nextStock });
              if (nextStock <= prod.low_stock_threshold) {
                lowStockWarnings.push(`${prod.name} (${nextStock} ${prod.unit})`);
              }
            }
          }
        }
      });
    }

    setBaskets((prev) => ({ ...prev, [activeCounter]: [] }));

    if (lowStockWarnings.length > 0) {
      setStatusMsg({
        type: 'warn',
        text: `Counter ${activeCounter} settled (₹${total} via ${mode}). Low stock: ${lowStockWarnings.join(', ')}.`,
      });
    } else {
      setStatusMsg({
        type: 'ok',
        text: `Counter ${activeCounter} bill of ₹${total} saved (${mode}).`,
      });
    }
  }

  return (
    <section className="rounded-xl border border-slate-800 bg-[#1E293B] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-slate-300" />
          <h2 className="text-base font-semibold text-white">Quick Bill</h2>
        </div>

        {/* Counter A / B Switcher */}
        <div className="flex rounded-lg border border-slate-700 bg-[#0F172A] p-0.5 text-xs">
          {(['A', 'B'] as const).map((counter) => (
            <button
              key={counter}
              type="button"
              onClick={() => setActiveCounter(counter)}
              className={`rounded-md px-3 py-1 font-medium transition-colors ${
                activeCounter === counter
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Counter {counter} ({baskets[counter].length})
            </button>
          ))}
        </div>
      </div>

      {/* Add Item Row */}
      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
        <select
          value={selectedProductId}
          onChange={(e) => setSelectedProductId(e.target.value)}
          className="flex-1 rounded-lg border border-slate-700 bg-[#0F172A] px-3 py-2 text-xs text-slate-100 focus:border-slate-500 focus:outline-none"
        >
          <option value="">Select item...</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} — ₹{p.selling_price}/{p.unit} (Stock: {p.stock})
            </option>
          ))}
        </select>

        <input
          type="number"
          step="0.05"
          min="0.05"
          value={qtyInput}
          onChange={(e) => setQtyInput(e.target.value)}
          placeholder="Qty (e.g. 0.25)"
          className="font-mono-num w-full rounded-lg border border-slate-700 bg-[#0F172A] px-3 py-2 text-xs text-slate-100 sm:w-28 focus:border-slate-500 focus:outline-none"
        />

        <button
          type="button"
          onClick={handleAddItem}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-white"
        >
          <Plus className="h-4 w-4" />
          <span>Add</span>
        </button>
      </div>

      {/* Thermal Receipt View */}
      <div className="rounded-lg border border-dashed border-slate-700 bg-[#0F172A] p-3">
        <div className="mb-2 flex items-center justify-between border-b border-slate-800 pb-1.5 text-[11px] uppercase tracking-wider text-slate-400">
          <span>Thermal Receipt — Counter {activeCounter}</span>
          <span className="font-mono-num">{currentItems.length} items</span>
        </div>

        {currentItems.length === 0 ? (
          <p className="py-5 text-center text-xs text-slate-500">
            No items in Counter {activeCounter} basket yet.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {currentItems.map((item, idx) => (
              <li
                key={`${item.name}-${idx}`}
                className="flex items-center justify-between text-xs text-slate-200"
              >
                <div>
                  <span className="font-medium">{item.name}</span>
                  <span className="font-mono-num ml-2 text-slate-400">
                    {item.qty} {item.unit} × ₹{item.price}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono-num font-semibold text-white">
                    ₹{item.subtotal.toFixed(2)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    className="text-slate-500 hover:text-[#EF4444]"
                    aria-label="Remove item"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3 flex items-center justify-between border-t border-slate-800 pt-2">
          <span className="text-xs font-medium text-slate-400">Total Payable</span>
          <span className="font-mono-num text-lg font-bold text-[#10B981]">
            ₹{total.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Settlement Controls */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={currentItems.length === 0}
          onClick={() => handleSettle('Cash')}
          className="rounded-lg bg-[#10B981] px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-40"
        >
          Settle Cash
        </button>

        <button
          type="button"
          disabled={currentItems.length === 0}
          onClick={() => handleSettle('UPI')}
          className="rounded-lg border border-[#10B981]/50 bg-[#10B981]/15 px-3 py-1.5 text-xs font-semibold text-[#10B981] hover:bg-[#10B981]/25 disabled:opacity-40"
        >
          Settle UPI
        </button>

        <div className="ml-auto flex items-center gap-1.5">
          <select
            value={khataCustomerId}
            onChange={(e) => setKhataCustomerId(e.target.value)}
            className="rounded-lg border border-slate-700 bg-[#0F172A] px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
          >
            <option value="">Khata customer...</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            disabled={currentItems.length === 0}
            onClick={() => handleSettle('Khata')}
            className="rounded-lg border border-[#F59E0B]/50 bg-[#F59E0B]/15 px-3 py-1.5 text-xs font-semibold text-[#F59E0B] hover:bg-[#F59E0B]/25 disabled:opacity-40"
          >
            Add to Khata
          </button>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`mt-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
            statusMsg.type === 'ok'
              ? 'border-[#10B981]/40 bg-[#10B981]/10 text-[#10B981]'
              : 'border-[#F59E0B]/40 bg-[#F59E0B]/10 text-[#F59E0B]'
          }`}
        >
          {statusMsg.type === 'ok' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}
    </section>
  );
}