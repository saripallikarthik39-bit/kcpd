import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Package, AlertTriangle, Clock, Search } from 'lucide-react';
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
  const products = useLiveQuery(() => db.products.toArray(), []);

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

        <div className="relative w-full sm:w-56">
          <Search className="pointer-events-none absolute top-2.5 left-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search SKU or alias (chini, paalu)..."
            className="w-full rounded-lg border border-slate-700 bg-[#0F172A] py-1.5 pr-3 pl-8 text-xs text-slate-100 placeholder:text-slate-500 focus:border-slate-500 focus:outline-none"
          />
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
                  <h3 className="text-sm font-semibold text-white">{item.name}</h3>
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
    </section>
  );
}