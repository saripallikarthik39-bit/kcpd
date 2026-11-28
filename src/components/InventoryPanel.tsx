import { useState, type FormEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Package, AlertTriangle, Clock, Search, Plus, X } from 'lucide-react';
import { db } from '../db/database';

function isExpiringSoon(expiryDate?: string): boolean {
  if (!expiryDate) return false;
  const now = new Date();
  const target = new Date(expiryDate + 'T23:59:59');
  const diffHours = (target.getTime() - now.getTime()) / (1000 * 60 * 60);
  return diffHours <= 48;
}

export function InventoryPanel() {
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    aliases: '',
    unit: 'pack',
    selling_price: '',
    wholesale_cost: '',
    stock: '',
    low_stock_threshold: '10',
  });

  const products = useLiveQuery(() => db.products.toArray(), []);

  const handleAddItem = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    await db.products.add({
      name: form.name.trim(),
      aliases: form.aliases
        .split(',')
        .map((a) => a.trim().toLowerCase())
        .filter(Boolean),
      unit: (form.unit.trim() || 'pack') as Parameters<typeof db.products.add>[0]['unit'],
      selling_price: Number(form.selling_price) || 0,
      wholesale_cost: Number(form.wholesale_cost) || 0,
      stock: Number(form.stock) || 0,
      low_stock_threshold: Number(form.low_stock_threshold) || 10,
      expiry_date: nextMonth,
    });

    setForm({
      name: '',
      aliases: '',
      unit: 'pack',
      selling_price: '',
      wholesale_cost: '',
      stock: '',
      low_stock_threshold: '10',
    });
    setShowAddForm(false);
  };

  if (!products) {
    return (
      <div className="rounded-xl border border-slate-800 bg-[#1E293B] p-4 text-sm text-slate-400">
        Loading inventory...
      </div>
    );
  }

  const query = search.trim().toLowerCase();
  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(query) ||
      p.aliases.some((alias) => alias.toLowerCase().includes(query))
  );

  return (
    <section className="rounded-xl border border-slate-800 bg-[#1E293B] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-slate-300" />
          <h2 className="text-base font-semibold text-white">
            Store Inventory ({products.length} SKUs)
          </h2>
        </div>

        <div className="flex w-full items-center gap-2 sm:w-auto">
          <div className="relative flex-1 sm:w-56">
            <Search className="pointer-events-none absolute top-2.5 left-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search SKU or alias (chini, paalu)..."
              className="w-full rounded-lg border border-slate-700 bg-[#0F172A] py-1.5 pr-3 pl-8 text-xs text-slate-100 placeholder:text-slate-500 focus:border-slate-500 focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#10B981] px-3 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-[#059669]"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Item
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((item) => {
          const lowStock = item.stock <= item.low_stock_threshold;
          const expiring = isExpiringSoon(item.expiry_date);

          return (
            <div
              key={item.id}
              className="rounded-lg border border-slate-700/80 bg-[#0F172A] p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    {item.name}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {item.aliases.slice(0, 3).join(', ')}
                  </p>
                </div>
                <span className="font-mono-num text-sm font-bold text-[#10B981]">
                  ₹{item.selling_price}/{item.unit}
                </span>
              </div>

              <div className="mt-2.5 flex items-center justify-between text-xs">
                <span className="font-mono-num text-slate-300">
                  Stock: {item.stock} {item.unit}
                </span>
                <span className="font-mono-num text-slate-500">
                  Cost: ₹{item.wholesale_cost}
                </span>
              </div>

              {(lowStock || expiring) && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {lowStock && (
                    <span className="inline-flex items-center gap-1 rounded bg-[#F59E0B]/15 px-2 py-0.5 text-[11px] font-medium text-[#F59E0B]">
                      <AlertTriangle className="h-3 w-3" />
                      Low Stock
                    </span>
                  )}
                  {expiring && (
                    <span className="inline-flex items-center gap-1 rounded bg-[#EF4444]/15 px-2 py-0.5 text-[11px] font-medium text-[#EF4444]">
                      <Clock className="h-3 w-3" />
                      Expiring Soon ({item.expiry_date})
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="py-6 text-center text-xs text-slate-400">
          No matching items found in local inventory.
        </p>
      )}

      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <form
            onSubmit={handleAddItem}
            className="w-full max-w-md space-y-3 rounded-xl border border-slate-700 bg-[#1E293B] p-5 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">
                Add New Item
              </h3>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <input
              required
              placeholder="Item Name (e.g., Parle-G)"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-slate-700 bg-[#0F172A] px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-slate-500 focus:outline-none"
            />

            <input
              placeholder="Voice aliases, comma-separated (e.g., parle, biscuit)"
              value={form.aliases}
              onChange={(e) => setForm({ ...form, aliases: e.target.value })}
              className="w-full rounded-lg border border-slate-700 bg-[#0F172A] px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-slate-500 focus:outline-none"
            />

            <div className="grid grid-cols-2 gap-2">
              <input
                required
                type="number"
                step="any"
                placeholder="Selling Price (₹)"
                value={form.selling_price}
                onChange={(e) =>
                  setForm({ ...form, selling_price: e.target.value })
                }
                className="rounded-lg border border-slate-700 bg-[#0F172A] px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-slate-500 focus:outline-none"
              />
              <input
                type="number"
                step="any"
                placeholder="Wholesale Cost (₹)"
                value={form.wholesale_cost}
                onChange={(e) =>
                  setForm({ ...form, wholesale_cost: e.target.value })
                }
                className="rounded-lg border border-slate-700 bg-[#0F172A] px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-slate-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                required
                type="number"
                step="any"
                placeholder="Stock Quantity"
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
                className="rounded-lg border border-slate-700 bg-[#0F172A] px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-slate-500 focus:outline-none"
              />
              <input
                placeholder="Unit (kg, pack, L)"
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className="rounded-lg border border-slate-700 bg-[#0F172A] px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-slate-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-[#10B981] px-4 py-1.5 text-xs font-semibold text-slate-950 hover:bg-[#059669]"
              >
                Save Item
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
