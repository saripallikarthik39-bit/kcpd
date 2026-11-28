import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ShoppingBag, CheckCircle2, Share2, Plus, AlertCircle } from 'lucide-react';
import { db } from '../db/database';

export function SarukuListPanel() {
  const products = useLiveQuery(() => db.products.toArray(), []) ?? [];
  const [newItemName, setNewItemName] = useState('');

  // Auto-filter all items that are finished (0) or below low-stock threshold
  const sarukuItems = products
    .filter((p) => p.stock <= p.low_stock_threshold)
    .sort((a, b) => a.stock - b.stock);

  async function handleMarkRestocked(id: number | undefined) {
    if (id === undefined) return;
    await db.products.update(id, { stock: 10 });
  }

  async function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = newItemName.trim();
    if (!cleaned) return;
    await db.products.add({
      name: cleaned.charAt(0).toUpperCase() + cleaned.slice(1),
      selling_price: 0,
      wholesale_cost: 0,
      unit: 'kg',
      stock: 0,
      low_stock_threshold: 2,
      aliases: [cleaned.toLowerCase()],
    });
    setNewItemName('');
  }

  function handleShareWhatsApp() {
    if (sarukuItems.length === 0) return;
    const lines = sarukuItems.map(
      (item, idx) =>
        `${idx + 1}. ${item.name} (${item.stock === 0 ? 'OUT OF STOCK' : `${item.stock} ${item.unit} left`})`
    );
    const msg = `Saruku / Restock List to bring for shop:\n\n${lines.join('\n')}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  }

  return (
    <section className="rounded-2xl border border-amber-500/25 bg-zinc-950/75 p-5 backdrop-blur-xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              Saruku List (Items to Bring from Market)
            </h3>
            <p className="text-xs text-stone-400">
              Auto-updated whenever you say &quot;item ayipoyindi&quot; or &quot;out of stock&quot;
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleShareWhatsApp}
          disabled={sarukuItems.length === 0}
          className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-bold text-zinc-950 hover:bg-emerald-400 disabled:opacity-40"
        >
          <Share2 className="h-3.5 w-3.5" />
          <span>Share Saruku on WhatsApp</span>
        </button>
      </div>

      {/* Manual quick-add */}
      <form onSubmit={handleQuickAdd} className="mb-4 flex gap-2">
        <input
          type="text"
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          placeholder="Add item to Saruku list (e.g. Groundnut Oil, Salt, Tea Powder)..."
          className="flex-1 rounded-xl border border-amber-500/25 bg-zinc-900/80 px-3.5 py-2 text-xs text-white placeholder:text-stone-500 focus:border-amber-400 focus:outline-none"
        />
        <button
          type="submit"
          className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-zinc-950 hover:bg-amber-400"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add</span>
        </button>
      </form>

      {sarukuItems.length === 0 ? (
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-6 text-center text-xs text-emerald-300">
          All items are currently stocked. Say &quot;Sugar ayipoyindi&quot; in the 3D Voice Co-Pilot to add an item here automatically.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sarukuItems.map((item) => {
            const isOut = item.stock <= 0;
            return (
              <div
                key={item.id}
                className={`flex items-center justify-between rounded-xl border p-3.5 ${
                  isOut
                    ? 'border-rose-500/40 bg-rose-950/25'
                    : 'border-amber-500/30 bg-amber-950/20'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <AlertCircle
                      className={`h-4 w-4 ${isOut ? 'text-rose-400' : 'text-amber-400'}`}
                    />
                    <p className="text-sm font-bold text-white">{item.name}</p>
                  </div>
                  <p className="font-mono-num mt-1 text-[11px] text-stone-300">
                    {isOut
                      ? 'Finished (0 left — bring immediately)'
                      : `Low stock: ${item.stock} ${item.unit} left`}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleMarkRestocked(item.id)}
                  className="flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/25"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Brought</span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}