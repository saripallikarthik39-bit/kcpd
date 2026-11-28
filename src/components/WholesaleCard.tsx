import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Eye, EyeOff, Headphones } from 'lucide-react';
import { db } from '../db/database';

export function WholesaleCard() {
  const products = useLiveQuery(() => db.products.toArray(), []) ?? [];
  const [selectedId, setSelectedId] = useState<string>('');
  const [revealed, setRevealed] = useState(false);

  const selected =
    products.find((p) => String(p.id) === selectedId) ??
    products.find((p) => p.name === 'Toor Dal') ??
    products[0];

  useEffect(() => {
    if (!revealed) return;
    const timer = setTimeout(() => setRevealed(false), 5000);
    return () => clearTimeout(timer);
  }, [revealed, selected?.id]);

  if (!selected) return null;

  const floorPrice = Math.ceil(selected.wholesale_cost * 1.08);
  const marginPct = (
    ((selected.selling_price - selected.wholesale_cost) / selected.selling_price) *
    100
  ).toFixed(1);

  return (
    <section className="rounded-xl border border-indigo-500/40 bg-[#312E81]/30 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Headphones className="h-5 w-5 text-indigo-300" />
          <div>
            <h2 className="text-sm font-semibold text-white">
              Discreet Margin & Floor Price (Anti-Shoulder-Surfing)
            </h2>
            <p className="text-[11px] text-indigo-200/70">
              Auto-blurs after 5 seconds during customer bargaining
            </p>
          </div>
        </div>

        <select
          value={selected.id ?? ''}
          onChange={(e) => {
            setSelectedId(e.target.value);
            setRevealed(true);
          }}
          className="rounded-lg border border-indigo-500/40 bg-[#0F172A] px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none"
        >
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={() => setRevealed((prev) => !prev)}
        className="w-full rounded-lg border border-indigo-500/30 bg-[#0F172A] p-3 text-left transition-colors hover:border-indigo-400"
      >
        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400">Wholesale Cost</p>
            <p
              className={`font-mono-num mt-1 text-lg font-bold text-indigo-300 transition-all ${
                revealed ? 'blur-0' : 'blur-md select-none'
              }`}
            >
              ₹{selected.wholesale_cost}/{selected.unit}
            </p>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400">
              Min Floor (+8%)
            </p>
            <p
              className={`font-mono-num mt-1 text-lg font-bold text-[#F59E0B] transition-all ${
                revealed ? 'blur-0' : 'blur-md select-none'
              }`}
            >
              ₹{floorPrice}/{selected.unit}
            </p>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400">Net Margin</p>
            <p
              className={`font-mono-num mt-1 text-lg font-bold text-[#10B981] transition-all ${
                revealed ? 'blur-0' : 'blur-md select-none'
              }`}
            >
              {marginPct}%
            </p>
          </div>
        </div>

        <div className="mt-2.5 flex items-center justify-between border-t border-slate-800 pt-2 text-[11px] text-indigo-200/80">
          <span className="flex items-center gap-1.5">
            {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {revealed ? 'Visible (auto-hides in 5s — tap to hide now)' : 'Blurred for privacy — tap to reveal'}
          </span>
          <span className="font-mono-num text-slate-400">
            Retail: ₹{selected.selling_price}/{selected.unit}
          </span>
        </div>
      </button>
    </section>
  );
}