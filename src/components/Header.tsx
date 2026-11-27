import { Wifi, WifiOff, RotateCcw, Volume2, Headphones, Mic } from 'lucide-react';

interface HeaderProps {
  isOnline: boolean;
  pendingCount: number;
  audioMode: 'speaker' | 'earpiece';
  onToggleAudioMode: () => void;
  onResetData: () => void;
  onMicClick: () => void;
}

export function Header({
  isOnline,
  pendingCount,
  audioMode,
  onToggleAudioMode,
  onResetData,
  onMicClick,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-800 bg-[#0F172A]">
      {/* Row 1: Title, Status Pill, Reset Data */}
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-white">
            Kirana Co-Pilot
          </h1>
          <p className="text-xs text-slate-400">Offline-First Counter HUD</p>
        </div>

        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${
              isOnline
                ? 'border-[#10B981]/40 bg-[#10B981]/10 text-[#10B981]'
                : 'border-[#F59E0B]/40 bg-[#F59E0B]/10 text-[#F59E0B]'
            }`}
          >
            {isOnline ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            <span>{isOnline ? 'Online' : 'Offline'}</span>
            {pendingCount > 0 && (
              <span className="font-mono-num ml-1 rounded bg-[#F59E0B]/20 px-1.5 py-0.5 text-[11px] text-[#F59E0B]">
                {pendingCount} queued
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onResetData}
            title="Reset and re-seed demo data"
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#1E293B] px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-slate-500 hover:bg-slate-800"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Data</span>
          </button>
        </div>
      </div>

      {/* Row 2: Audio Routing Preview + Wet-Hands Mic Hook */}
      <div className="border-t border-slate-800/80 bg-[#1E293B]/60">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-2">
          <button
            type="button"
            onClick={onToggleAudioMode}
            className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              audioMode === 'earpiece'
                ? 'border-indigo-500 bg-[#312E81] text-indigo-100'
                : 'border-slate-700 bg-[#1E293B] text-slate-200'
            }`}
          >
            {audioMode === 'earpiece' ? (
              <Headphones className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
            <span>
              {audioMode === 'earpiece'
                ? 'BT Earpiece (Private Whisper Preview)'
                : 'Counter Speaker (Browser Audio Preview)'}
            </span>
          </button>

          <button
            type="button"
            onClick={onMicClick}
            className="flex items-center gap-2 rounded-lg border border-[#10B981]/50 bg-[#10B981]/15 px-4 py-1.5 text-xs font-semibold text-[#10B981] hover:bg-[#10B981]/25"
          >
            <Mic className="h-4 w-4" />
            <span>Wet-Hands Voice Mic (Person 2 Hook)</span>
          </button>
        </div>
      </div>
    </header>
  );
}