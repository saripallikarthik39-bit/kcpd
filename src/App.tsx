import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutGrid,
  Receipt,
  BookOpen,
  Box,
  Package,
  ShieldCheck,
  Headphones,
  Mic,
  Wifi,
  WifiOff,
  RotateCcw,
  Volume2,
  ArrowLeft,
  Sparkles,
  Info,
  ChevronRight,
  ShoppingBag,
} from 'lucide-react';
import { db, initDatabaseWithRecovery } from './db/database';
import { seedDatabase, resetAndReseed } from './db/seed';
import { flushOfflineQueue, getPendingQueueCount } from './db/offlineQueue';
import { Background3D } from './components/Background3D';
import { KpiStrip } from './components/KpiStrip';
import { VoiceOrb3D } from './components/VoiceOrb3D';
import { StoreShelf3D } from './components/StoreShelf3D';
import { QuickBillPanel } from './components/QuickBillPanel';
import { KhataPanel } from './components/KhataPanel';
import { WholesaleCard } from './components/WholesaleCard';
import { TiltCard3D } from './components/TiltCard3D';
import { InventoryPanel } from './components/InventoryPanel';
import { SarukuListPanel } from './components/SarukuListPanel';

type PageId =
  | 'home'
  | 'voice-orb'
  | 'saruku'
  | 'quick-bill'
  | 'khata'
  | 'shelf-3d'
  | 'inventory'
  | 'upi-events'
  | 'wholesale';

export function App() {
  const [activePage, setActivePage] = useState<PageId>('home');
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [pendingCount, setPendingCount] = useState(0);
  const [audioMode, setAudioMode] = useState<'speaker' | 'earpiece'>('speaker');
  const [bannerMsg, setBannerMsg] = useState<string | null>(null);

  const products = useLiveQuery(() => db.products.toArray(), []) ?? [];
  const customers = useLiveQuery(() => db.customers.toArray(), []) ?? [];
  const upiEvents =
    useLiveQuery(
      () => db.upi_events.orderBy('received_at').reverse().limit(12).toArray(),
      []
    ) ?? [];
  const unsyncedCount =
    useLiveQuery(
      () => db.khata_transactions.filter((tx) => !tx.synced).count(),
      []
    ) ?? 0;

  const lowStockCount = products.filter((p) => p.stock <= p.low_stock_threshold).length;
  const totalKhata = customers.reduce((sum, c) => sum + c.khata_balance, 0);

  useEffect(() => {
    setPendingCount(unsyncedCount);
  }, [unsyncedCount]);

  useEffect(() => {
    let active = true;
    initDatabaseWithRecovery(seedDatabase)
      .then(async () => {
        if (!active) return;
        const queued = await getPendingQueueCount();
        setPendingCount(queued);
        setDbReady(true);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setDbError(err instanceof Error ? err.message : 'Failed to open local database');
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    async function handleOnline() {
      setIsOnline(true);
      const flushed = await flushOfflineQueue();
      setPendingCount(0);
      if (flushed > 0) {
        setBannerMsg(`Back online: flushed ${flushed} queued offline entries locally.`);
      }
    }
    function handleOffline() {
      setIsOnline(false);
      setBannerMsg('Offline mode active: all bills and Khata entries are saved locally.');
    }
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  async function handleResetData() {
    await resetAndReseed();
    setBannerMsg('Demo database reset and re-seeded cleanly (9 SKUs, 3 Khata accounts).');
  }

  const modules: {
    id: PageId;
    title: string;
    subtitle: string;
    stat: string;
    icon: typeof LayoutGrid;
    gradient: string;
    border: string;
  }[] = [
    {
      id: 'voice-orb',
      title: '3D Voice Co-Pilot',
      subtitle: 'Live multilingual mic for Khata, Saruku & trusted staff voices',
      stat: 'Live Mic',
      icon: Mic,
      gradient: 'from-orange-500/20 via-amber-500/10 to-transparent',
      border: 'border-orange-500/35 hover:border-orange-400',
    },
    {
      id: 'saruku',
      title: 'Saruku (Restock) List',
      subtitle: 'Auto-filled when you say "item ayipoyindi" or "out of stock"',
      stat: `${lowStockCount} To Bring`,
      icon: ShoppingBag,
      gradient: 'from-rose-500/25 via-amber-500/10 to-transparent',
      border: 'border-rose-500/40 hover:border-rose-400',
    },
    {
      id: 'quick-bill',
      title: 'Quick Bill POS',
      subtitle: 'Counter A / B billing with instant Cash, UPI & Khata',
      stat: '2 Counters',
      icon: Receipt,
      gradient: 'from-amber-500/20 via-orange-500/10 to-transparent',
      border: 'border-amber-500/35 hover:border-amber-400',
    },
    {
      id: 'khata',
      title: 'Customer Khata',
      subtitle: 'Offline udhar ledger & one-tap WhatsApp reminders',
      stat: `₹${totalKhata.toFixed(0)} Due`,
      icon: BookOpen,
      gradient: 'from-rose-500/20 via-orange-500/10 to-transparent',
      border: 'border-rose-500/35 hover:border-rose-400',
    },
    {
      id: 'shelf-3d',
      title: '3D Live Inventory Shelf',
      subtitle: 'Interactive rotating 3D stock & expiry towers',
      stat: 'Live 3D',
      icon: Box,
      gradient: 'from-emerald-500/20 via-teal-500/10 to-transparent',
      border: 'border-emerald-500/35 hover:border-emerald-400',
    },
    {
      id: 'inventory',
      title: 'Store Inventory',
      subtitle: 'Search SKUs by English, Hinglish & Telugu aliases',
      stat: `${products.length} SKUs · ${lowStockCount} Low`,
      icon: Package,
      gradient: 'from-yellow-500/20 via-amber-500/10 to-transparent',
      border: 'border-yellow-500/35 hover:border-yellow-400',
    },
    {
      id: 'upi-events',
      title: 'Recent UPI Events',
      subtitle: 'Simulated local payment verification feed (Person 3)',
      stat: `${upiEvents.length} Events`,
      icon: ShieldCheck,
      gradient: 'from-emerald-500/20 via-lime-500/10 to-transparent',
      border: 'border-emerald-500/35 hover:border-emerald-400',
    },
    {
      id: 'wholesale',
      title: 'Wholesale Margin Vault',
      subtitle: 'Anti-shoulder-surfing cost & 8% floor price lookup',
      stat: 'Auto-Blur 5s',
      icon: Headphones,
      gradient: 'from-fuchsia-500/20 via-rose-500/10 to-transparent',
      border: 'border-fuchsia-500/35 hover:border-fuchsia-400',
    },
  ];

  const currentModule = modules.find((m) => m.id === activePage);

  if (dbError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070709] p-4 text-center">
        <div className="max-w-md rounded-xl border border-rose-500/40 bg-zinc-900 p-5">
          <h2 className="text-base font-bold text-rose-400">Local Database Error</h2>
          <p className="mt-2 text-xs text-stone-300">{dbError}</p>
        </div>
      </div>
    );
  }

  if (!dbReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070709] text-sm text-amber-400">
        Booting Kirana Co-Pilot 3D OS...
      </div>
    );
  }

  return (
    <div className="theme-pro relative flex min-h-screen text-stone-100">
      {/* 3D BACKGROUND LAYER */}
      <Background3D />

      {/* FOREGROUND APP SHELL */}
      <div className="relative z-10 flex min-h-screen w-full">
        {/* Left Navigation Dock (Desktop) */}
        <aside className="hidden w-64 shrink-0 flex-col justify-between border-r border-amber-500/20 bg-zinc-950/80 p-4 backdrop-blur-xl lg:flex">
          <div>
            <button
              type="button"
              onClick={() => setActivePage('home')}
              className="mb-6 flex w-full items-center gap-3 text-left"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 text-zinc-950 shadow-lg shadow-amber-500/25">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-base font-bold tracking-tight text-white">
                  Kirana Co-Pilot
                </h1>
                <p className="text-[11px] font-medium text-amber-400">
                  3D Counter OS
                </p>
              </div>
            </button>

            <nav className="space-y-1.5">
              <button
                type="button"
                onClick={() => setActivePage('home')}
                className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-xs font-semibold transition-all ${
                  activePage === 'home'
                    ? 'border-amber-400/60 bg-gradient-to-r from-amber-500/25 to-orange-500/10 text-amber-300'
                    : 'border-transparent text-stone-300 hover:border-amber-500/25 hover:bg-zinc-900/70'
                }`}
              >
                <LayoutGrid className="h-4 w-4" />
                <span>Dashboard Home</span>
              </button>

              <p className="px-2 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-stone-500">
                Counter Modules
              </p>

              {modules.map((mod) => {
                const Icon = mod.icon;
                const active = activePage === mod.id;
                return (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => setActivePage(mod.id)}
                    className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-xs font-medium transition-all ${
                      active
                        ? 'border-amber-400/60 bg-gradient-to-r from-amber-500/25 to-orange-500/10 text-amber-300'
                        : 'border-transparent text-stone-300 hover:border-amber-500/25 hover:bg-zinc-900/70 hover:text-white'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{mod.title}</span>
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="rounded-xl border border-amber-500/20 bg-zinc-900/70 p-3 text-[11px] text-stone-400">
            <p className="font-semibold text-amber-300">Offline-First Ready</p>
            <p className="mt-0.5 text-[10px] text-stone-500">
              All billing, Khata, Saruku &amp; voice logs run locally in IndexedDB.
            </p>
          </div>
        </aside>

        {/* Right Workspace */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top Glass Status Bar */}
          <header className="sticky top-0 z-20 border-b border-amber-500/20 bg-zinc-950/75 px-4 py-3 backdrop-blur-xl">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                {activePage !== 'home' && (
                  <button
                    type="button"
                    onClick={() => setActivePage('home')}
                    className="flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/25"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Dashboard</span>
                  </button>
                )}
                <div>
                  <h2 className="text-base font-bold text-white">
                    {currentModule ? currentModule.title : 'Kirana Command Dashboard'}
                  </h2>
                  <p className="text-[11px] text-stone-400">
                    {currentModule
                      ? currentModule.subtitle
                      : 'Select any counter module below to open its full workspace'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${
                    isOnline
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                      : 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                  }`}
                >
                  {isOnline ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
                  <span>{isOnline ? 'Online' : 'Offline'}</span>
                  {pendingCount > 0 && (
                    <span className="font-mono-num ml-1 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px]">
                      {pendingCount} queued
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setAudioMode((prev) => (prev === 'speaker' ? 'earpiece' : 'speaker'))
                  }
                  className="flex items-center gap-1.5 rounded-lg border border-amber-500/25 bg-zinc-900/80 px-2.5 py-1.5 text-xs font-medium text-stone-200 hover:border-amber-400"
                >
                  {audioMode === 'earpiece' ? (
                    <Headphones className="h-3.5 w-3.5 text-amber-400" />
                  ) : (
                    <Volume2 className="h-3.5 w-3.5 text-emerald-400" />
                  )}
                  <span className="hidden sm:inline">
                    {audioMode === 'earpiece' ? 'BT Earpiece' : 'Speaker'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleResetData}
                  className="flex items-center gap-1.5 rounded-lg border border-amber-500/25 bg-zinc-900/80 px-2.5 py-1.5 text-xs font-medium text-stone-200 hover:border-amber-400"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reset Data</span>
                </button>
              </div>
            </div>
          </header>

          {/* Main Content Area */}
          <main className="mx-auto w-full max-w-6xl flex-1 space-y-5 p-4 sm:p-6">
            {bannerMsg && (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-500/35 bg-zinc-900/80 px-3.5 py-2.5 text-xs text-stone-100 backdrop-blur-md">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 shrink-0 text-amber-400" />
                  <span>{bannerMsg}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setBannerMsg(null)}
                  className="text-stone-400 hover:text-white"
                >
                  Dismiss
                </button>
              </div>
            )}

            <AnimatePresence mode="wait">
              <motion.div
                key={activePage}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                {/* HOME: Pro App Launcher Grid */}
                {activePage === 'home' && (
                  <>
                    <KpiStrip />

                    <div>
                      <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-amber-400/90">
                        Select a Module to Open
                      </h3>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {modules.map((mod) => {
                          const Icon = mod.icon;
                          return (
                            <TiltCard3D key={mod.id}>
                              <button
                                type="button"
                                onClick={() => setActivePage(mod.id)}
                                className={`group flex h-full w-full flex-col justify-between rounded-2xl border bg-gradient-to-br ${mod.gradient} bg-zinc-950/75 p-5 text-left backdrop-blur-xl transition-all ${mod.border}`}
                              >
                                <div className="flex w-full items-start justify-between">
                                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-zinc-900/90 text-amber-300 transition-transform group-hover:scale-105">
                                    <Icon className="h-5 w-5" />
                                  </div>
                                  <span className="font-mono-num rounded-full border border-white/10 bg-zinc-900/90 px-2.5 py-1 text-[11px] font-semibold text-stone-200">
                                    {mod.stat}
                                  </span>
                                </div>

                                <div className="mt-4">
                                  <h4 className="text-base font-bold text-white transition-colors group-hover:text-amber-300">
                                    {mod.title}
                                  </h4>
                                  <p className="mt-1 text-xs text-stone-400">
                                    {mod.subtitle}
                                  </p>
                                </div>

                                <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-amber-400">
                                  <span>Open workspace</span>
                                  <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                                </div>
                              </button>
                            </TiltCard3D>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

                {/* DEDICATED MODULE PAGES */}
                {activePage === 'voice-orb' && (
                  <VoiceOrb3D
                    audioMode={audioMode}
                    onCommandSubmit={(msg) => setBannerMsg(msg)}
                  />
                )}

                {activePage === 'saruku' && <SarukuListPanel />}

                {activePage === 'quick-bill' && (
                  <TiltCard3D>
                    <QuickBillPanel />
                  </TiltCard3D>
                )}

                {activePage === 'khata' && (
                  <TiltCard3D>
                    <KhataPanel />
                  </TiltCard3D>
                )}

                {activePage === 'shelf-3d' && <StoreShelf3D />}

                {activePage === 'inventory' && <InventoryPanel />}

                {activePage === 'upi-events' && (
                  <section className="rounded-2xl border border-emerald-500/25 bg-zinc-950/75 p-5 backdrop-blur-xl">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-emerald-400" />
                        <h3 className="text-base font-semibold text-white">
                          Recent UPI Events ({upiEvents.length})
                        </h3>
                      </div>
                      <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] text-emerald-300">
                        Person 3 simulator writes live to db.upi_events
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {upiEvents.map((ev) => (
                        <div
                          key={ev.id}
                          className="flex items-center justify-between rounded-xl border border-amber-500/20 bg-zinc-900/80 px-3.5 py-3 text-xs"
                        >
                          <div>
                            <p className="font-semibold text-white">
                              {ev.sender}{' '}
                              <span className="font-normal text-stone-400">({ev.app})</span>
                            </p>
                            <p className="font-mono-num mt-0.5 text-[11px] text-stone-500">
                              {ev.transaction_id}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-mono-num text-base font-bold text-emerald-400">
                              ₹{ev.amount}
                            </p>
                            <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300">
                              {ev.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {activePage === 'wholesale' && <WholesaleCard />}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;