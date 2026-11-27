import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ShieldCheck, Info } from 'lucide-react';
import { db, initDatabaseWithRecovery } from './db/database';
import { seedDatabase, resetAndReseed } from './db/seed';
import { flushOfflineQueue, getPendingQueueCount } from './db/offlineQueue';
import { Header } from './components/Header';
import { QuickBillPanel } from './components/QuickBillPanel';
import { KhataPanel } from './components/KhataPanel';
import { InventoryPanel } from './components/InventoryPanel';

export function App() {
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [pendingCount, setPendingCount] = useState(0);
  const [audioMode, setAudioMode] = useState<'speaker' | 'earpiece'>('speaker');
  const [bannerMsg, setBannerMsg] = useState<string | null>(null);

  const upiEvents =
    useLiveQuery(
      () => db.upi_events.orderBy('received_at').reverse().limit(6).toArray(),
      []
    ) ?? [];

  const unsyncedCount =
    useLiveQuery(
      () => db.khata_transactions.filter((tx) => !tx.synced).count(),
      []
    ) ?? 0;

  useEffect(() => {
    setPendingCount(unsyncedCount);
  }, [unsyncedCount]);

  // Initialize Dexie DB with UpgradeError auto-recovery
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

  // Listen for Online / Offline changes and flush local queue on reconnect
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
    setBannerMsg('Demo database reset and re-seeded cleanly.');
  }

  function handleMicClick() {
    setBannerMsg(
      'Voice hook ready for Person 2 (src/engine/processVoiceCommand). Use Quick Bill or Khata forms below to test local storage.'
    );
  }

  if (dbError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0F172A] p-4 text-center">
        <div className="max-w-md rounded-xl border border-[#EF4444]/40 bg-[#1E293B] p-5">
          <h2 className="text-base font-bold text-[#EF4444]">Local Database Error</h2>
          <p className="mt-2 text-xs text-slate-300">{dbError}</p>
        </div>
      </div>
    );
  }

  if (!dbReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0F172A] text-sm text-slate-400">
        Initializing offline store database...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F172A] pb-12 text-slate-100">
      <Header
        isOnline={isOnline}
        pendingCount={pendingCount}
        audioMode={audioMode}
        onToggleAudioMode={() =>
          setAudioMode((prev) => (prev === 'speaker' ? 'earpiece' : 'speaker'))
        }
        onResetData={handleResetData}
        onMicClick={handleMicClick}
      />

      <main className="mx-auto max-w-6xl space-y-4 px-4 pt-4">
        {bannerMsg && (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-700 bg-[#1E293B] px-3 py-2 text-xs text-slate-200">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 shrink-0 text-[#10B981]" />
              <span>{bannerMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setBannerMsg(null)}
              className="text-slate-400 hover:text-white"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Top Row: Quick Bill + Customer Khata */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <QuickBillPanel />
          <KhataPanel />
        </div>

        {/* Live UPI Feed Preview (Person 3 Simulator writes into db.upi_events) */}
        <section className="rounded-xl border border-slate-800 bg-[#1E293B] p-4">
          <div className="mb-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[#10B981]" />
              <h2 className="text-base font-semibold text-white">
                Recent UPI Events (Simulated Local Feed)
              </h2>
            </div>
            <span className="text-[11px] text-slate-400">
              Person 3 simulator writes to db.upi_events
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {upiEvents.map((ev) => (
              <div
                key={ev.id}
                className="flex items-center justify-between rounded-lg border border-slate-700/80 bg-[#0F172A] px-3 py-2 text-xs"
              >
                <div>
                  <p className="font-semibold text-white">
                    {ev.sender}{' '}
                    <span className="font-normal text-slate-400">({ev.app})</span>
                  </p>
                  <p className="font-mono-num text-[11px] text-slate-500">
                    {ev.transaction_id}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono-num text-sm font-bold text-[#10B981]">
                    ₹{ev.amount}
                  </p>
                  <span className="rounded bg-[#10B981]/15 px-1.5 py-0.5 text-[10px] font-medium text-[#10B981]">
                    {ev.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Full Store Inventory */}
        <InventoryPanel />
      </main>
    </div>
  );
}

export default App;