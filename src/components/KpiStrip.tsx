import { useLiveQuery } from 'dexie-react-hooks';
import { IndianRupee, BookOpen, AlertTriangle, Clock } from 'lucide-react';
import { db } from '../db/database';

function isExpiringWithin48h(expiryDate?: string): boolean {
  if (!expiryDate) return false;
  const diffHours =
    (new Date(expiryDate + 'T23:59:59').getTime() - Date.now()) / (1000 * 60 * 60);
  return diffHours <= 48;
}

export function KpiStrip() {
  const bills = useLiveQuery(() => db.bills.toArray(), []) ?? [];
  const customers = useLiveQuery(() => db.customers.toArray(), []) ?? [];
  const products = useLiveQuery(() => db.products.toArray(), []) ?? [];

  const totalSales = bills.reduce((sum, b) => sum + b.total, 0);
  const totalKhata = customers.reduce((sum, c) => sum + c.khata_balance, 0);
  const lowStockCount = products.filter((p) => p.stock <= p.low_stock_threshold).length;
  const expiringCount = products.filter((p) => isExpiringWithin48h(p.expiry_date)).length;

  const cards = [
    {
      label: 'Counter Sales',
      value: `₹${totalSales.toFixed(0)}`,
      sub: `${bills.length} bills settled`,
      accent: 'text-[#10B981] border-[#10B981]/30',
      icon: IndianRupee,
    },
    {
      label: 'Pending Khata',
      value: `₹${totalKhata.toFixed(0)}`,
      sub: `${customers.length} active accounts`,
      accent: 'text-[#F59E0B] border-[#F59E0B]/30',
      icon: BookOpen,
    },
    {
      label: 'Low Stock Radar',
      value: `${lowStockCount} SKU`,
      sub: lowStockCount > 0 ? 'Restock list ready' : 'All stocked',
      accent: lowStockCount > 0 ? 'text-[#F59E0B] border-[#F59E0B]/30' : 'text-slate-300 border-slate-700',
      icon: AlertTriangle,
    },
    {
      label: 'Expiry Radar (48h)',
      value: `${expiringCount} Batch`,
      sub: expiringCount > 0 ? 'Action needed today' : 'No urgent expiry',
      accent: expiringCount > 0 ? 'text-[#EF4444] border-[#EF4444]/30' : 'text-slate-300 border-slate-700',
      icon: Clock,
    },
  ];

  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className={`rounded-xl border bg-[#1E293B] p-3.5 transition-transform duration-200 hover:-translate-y-0.5 ${card.accent}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                {card.label}
              </span>
              <Icon className="h-4 w-4 opacity-80" />
            </div>
            <p className="font-mono-num mt-1.5 text-xl font-bold text-white">
              {card.value}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">{card.sub}</p>
          </div>
        );
      })}
    </section>
  );
}