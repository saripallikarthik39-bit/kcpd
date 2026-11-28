import {
  LayoutDashboard,
  Receipt,
  BookOpen,
  Box,
  Package,
  ShieldCheck,
  Headphones,
  Sparkles,
  X,
} from 'lucide-react';

export type DashboardTab =
  | 'overview'
  | 'quick-bill'
  | 'khata'
  | 'shelf-3d'
  | 'inventory'
  | 'upi-events'
  | 'wholesale';

interface DashboardSidebarProps {
  activeTab: DashboardTab;
  onSelectTab: (tab: DashboardTab) => void;
  counts: {
    skuCount: number;
    khataCount: number;
    upiCount: number;
    lowStockCount: number;
  };
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function DashboardSidebar({
  activeTab,
  onSelectTab,
  counts,
  mobileOpen,
  onCloseMobile,
}: DashboardSidebarProps) {
  const navItems: {
    id: DashboardTab;
    label: string;
    subtitle: string;
    icon: typeof LayoutDashboard;
    badge?: string;
  }[] = [
    {
      id: 'overview',
      label: 'Command Center',
      subtitle: 'KPIs & 3D Voice Orb',
      icon: LayoutDashboard,
    },
    {
      id: 'quick-bill',
      label: 'Quick Bill',
      subtitle: 'Counter A / B POS',
      icon: Receipt,
    },
    {
      id: 'khata',
      label: 'Customer Khata',
      subtitle: 'Udhar & WhatsApp',
      icon: BookOpen,
      badge: `${counts.khataCount}`,
    },
    {
      id: 'shelf-3d',
      label: '3D Inventory Shelf',
      subtitle: 'Live 3D Visualizer',
      icon: Box,
      badge: '3D',
    },
    {
      id: 'inventory',
      label: 'Store Inventory',
      subtitle: 'All SKUs & Aliases',
      icon: Package,
      badge: counts.lowStockCount > 0 ? `${counts.lowStockCount} Low` : `${counts.skuCount}`,
    },
    {
      id: 'upi-events',
      label: 'Recent UPI Events',
      subtitle: 'Simulated Local Feed',
      icon: ShieldCheck,
      badge: `${counts.upiCount}`,
    },
    {
      id: 'wholesale',
      label: 'Wholesale Vault',
      subtitle: 'Anti-Shoulder-Surfing',
      icon: Headphones,
    },
  ];

  const content = (
    <div className="flex h-full flex-col justify-between border-r border-amber-500/15 bg-zinc-950/85 p-4 backdrop-blur-xl">
      <div>
        {/* Brand Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 text-zinc-950 shadow-lg shadow-amber-500/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-stone-100">
                Kirana Co-Pilot
              </h1>
              <p className="text-[11px] font-medium text-amber-400/80">
                3D Counter OS
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCloseMobile}
            className="rounded-lg p-1 text-stone-400 hover:bg-zinc-800 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Modules */}
        <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-stone-500">
          Select Dashboard View
        </p>

        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectTab(item.id);
                  onCloseMobile();
                }}
                className={`group flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left transition-all ${
                  isActive
                    ? 'border-amber-500/50 bg-gradient-to-r from-amber-500/20 to-orange-500/10 text-amber-300 shadow-md shadow-amber-950/30'
                    : 'border-transparent text-stone-300 hover:border-amber-500/20 hover:bg-zinc-900/70 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      isActive ? 'text-amber-400' : 'text-stone-400 group-hover:text-amber-300'
                    }`}
                  />
                  <div>
                    <p className="text-xs font-semibold leading-tight">{item.label}</p>
                    <p className="text-[10px] text-stone-500">{item.subtitle}</p>
                  </div>
                </div>

                {item.badge && (
                  <span
                    className={`font-mono-num rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                      isActive
                        ? 'bg-amber-400 text-zinc-950'
                        : 'bg-zinc-800 text-stone-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Tag */}
      <div className="mt-6 rounded-xl border border-amber-500/15 bg-zinc-900/60 p-3 text-[11px] text-stone-400">
        <p className="font-semibold text-amber-300">Offline-First Engine</p>
        <p className="mt-0.5 text-[10px] text-stone-500">
          Dexie IndexedDB active. All counter bills & Khata sync locally.
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden w-64 shrink-0 lg:block">{content}</aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="w-68 max-w-[80vw]">{content}</div>
          <div
            className="flex-1 bg-black/60 backdrop-blur-xs"
            onClick={onCloseMobile}
          />
        </div>
      )}
    </>
  );
}