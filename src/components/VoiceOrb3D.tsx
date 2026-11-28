import { useEffect, useRef, useState } from 'react';
import { Mic, Send, Cpu, ArrowRight } from 'lucide-react';

export type OrbState = 'idle' | 'listening' | 'verified' | 'fraud' | 'earpiece';

interface PipelinePreview {
  raw: string;
  entities: string;
  latencyMs: number;
  reply: string;
}

interface VoiceOrb3DProps {
  audioMode: 'speaker' | 'earpiece';
  onCommandSubmit?: (command: string) => void;
}

const DEMO_CHIPS: { label: string; state: OrbState; preview: PipelinePreview }[] = [
  {
    label: 'Did ₹340 come from Suresh?',
    state: 'fraud',
    preview: {
      raw: 'Did ₹340 come from Suresh?',
      entities: 'intent: verifyUpiPayment | sender: Suresh | amount: ₹340',
      latencyMs: 9,
      reply: 'ALERT: No ₹340 UPI payment found from Suresh in the last 5 minutes.',
    },
  },
  {
    label: "Uh, add 2 kg sugar, actually 3, and 1 Surf Excel to Sharma ji's khata",
    state: 'verified',
    preview: {
      raw: "Uh, add 2 kg sugar, actually 3, and 1 Surf Excel to Sharma ji's khata",
      entities: 'intent: logKhata | customer: Sharma ji | items: 3kg Sugar, 1 Surf Excel',
      latencyMs: 12,
      reply: 'Added ₹264 (3 kg Sugar + 1 Surf Excel) to Sharma ji khata.',
    },
  },
  {
    label: '250g jeera at ₹400/kg and 3 Maggi',
    state: 'verified',
    preview: {
      raw: '250g jeera at ₹400/kg and 3 Maggi',
      entities: 'intent: calculateQuickBill | 0.25kg Jeera (₹100) + 3 Maggi (₹42)',
      latencyMs: 7,
      reply: 'Counter A total is ₹142. Ready to settle via Cash, UPI, or Khata.',
    },
  },
  {
    label: 'Buying rate for Toor Dal?',
    state: 'earpiece',
    preview: {
      raw: 'Buying rate for Toor Dal?',
      entities: 'intent: getWholesaleRate | sku: Toor Dal | discreet: true',
      latencyMs: 6,
      reply: 'Whisper: Toor Dal cost is ₹132/kg. Minimum floor price is ₹143/kg.',
    },
  },
  {
    label: 'Check low stock and expiry',
    state: 'listening',
    preview: {
      raw: 'Check low stock and expiry',
      entities: 'intent: checkInventory | flags: low_stock, expiring_48h',
      latencyMs: 11,
      reply: 'Jeera is low (0.4 kg left). Milk batch expires tomorrow.',
    },
  },
  {
    label: 'Send WhatsApp reminder to Sharma ji',
    state: 'verified',
    preview: {
      raw: 'Send WhatsApp reminder to Sharma ji',
      entities: 'intent: sendWhatsAppReminder | customer: Sharma ji | ₹450',
      latencyMs: 8,
      reply: 'Drafted polite Hinglish reminder for Sharma ji (₹450). Tap to open WhatsApp.',
    },
  },
];

const STATE_COLORS: Record<OrbState, { rgb: string; badge: string; label: string }> = {
  idle: { rgb: '148, 163, 184', badge: 'text-slate-300 border-slate-700', label: 'Standby 3D Core' },
  listening: { rgb: '245, 158, 11', badge: 'text-[#F59E0B] border-[#F59E0B]/40', label: 'Listening...' },
  verified: { rgb: '16, 185, 129', badge: 'text-[#10B981] border-[#10B981]/40', label: 'Verified Action' },
  fraud: { rgb: '239, 68, 68', badge: 'text-[#EF4444] border-[#EF4444]/40', label: 'Fraud Alert' },
  earpiece: { rgb: '129, 140, 248', badge: 'text-indigo-300 border-indigo-500/40', label: 'Private Earpiece' },
};

export function VoiceOrb3D({ audioMode, onCommandSubmit }: VoiceOrb3DProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [orbState, setOrbState] = useState<OrbState>(audioMode === 'earpiece' ? 'earpiece' : 'idle');
  const [inputText, setInputText] = useState('');
  const [pipeline, setPipeline] = useState<PipelinePreview>({
    raw: 'Tap the 3D Orb or a quick chip to preview voice routing...',
    entities: 'Waiting for Person 2 engine / local command',
    latencyMs: 0,
    reply: 'Ready on counter.',
  });

  useEffect(() => {
    if (audioMode === 'earpiece' && orbState === 'idle') {
      setOrbState('earpiece');
    } else if (audioMode === 'speaker' && orbState === 'earpiece') {
      setOrbState('idle');
    }
  }, [audioMode, orbState]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pointCount = 140;
    const points: { x: number; y: number; z: number }[] = [];
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));

    for (let i = 0; i < pointCount; i++) {
      const y = 1 - (i / (pointCount - 1)) * 2;
      const radiusAtY = Math.sqrt(1 - y * y);
      const theta = goldenAngle * i;
      points.push({
        x: Math.cos(theta) * radiusAtY,
        y,
        z: Math.sin(theta) * radiusAtY,
      });
    }

    let angleY = 0;
    let angleX = 0.35;
    let pulse = 0;
    let animationId = 0;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const speed = orbState === 'listening' ? 0.032 : orbState === 'fraud' ? 0.045 : 0.012;
      angleY += speed;
      angleX += speed * 0.35;
      pulse += orbState === 'idle' ? 0.03 : 0.1;

      const baseRadius = 52 + Math.sin(pulse) * (orbState === 'idle' ? 2 : 6);
      const cx = width / 2;
      const cy = height / 2;
      const rgb = STATE_COLORS[orbState].rgb;

      const cosY = Math.cos(angleY);
      const sinY = Math.sin(angleY);
      const cosX = Math.cos(angleX);
      const sinX = Math.sin(angleX);

      ctx.beginPath();
      ctx.strokeStyle = `rgba(${rgb}, 0.22)`;
      ctx.lineWidth = 1.2;
      ctx.ellipse(cx, cy, baseRadius + 14, (baseRadius + 14) * 0.36, angleX * 0.4, 0, Math.PI * 2);
      ctx.stroke();

      const projected = points
        .map((p) => {
          const x1 = p.x * cosY - p.z * sinY;
          const z1 = p.z * cosY + p.x * sinY;
          const y2 = p.y * cosX - z1 * sinX;
          const z2 = z1 * cosX + p.y * sinX;

          const perspective = 220 / (220 - z2 * baseRadius);
          return {
            sx: cx + x1 * baseRadius * perspective,
            sy: cy + y2 * baseRadius * perspective,
            z: z2,
            size: Math.max(1.1, (z2 + 1.5) * 1.35),
            alpha: Math.max(0.18, (z2 + 1.2) / 2.2),
          };
        })
        .sort((a, b) => a.z - b.z);

      for (const pt of projected) {
        ctx.beginPath();
        ctx.fillStyle = `rgba(${rgb}, ${pt.alpha.toFixed(2)})`;
        ctx.arc(pt.sx, pt.sy, pt.size, 0, Math.PI * 2);
        ctx.fill();
      }

      animationId = requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationId);
  }, [orbState]);

  function triggerChip(chip: (typeof DEMO_CHIPS)[number]) {
    setOrbState(chip.state);
    setPipeline(chip.preview);
    onCommandSubmit?.(chip.label);
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = inputText.trim();
    if (!cleaned) return;
    setOrbState('verified');
    setPipeline({
      raw: cleaned,
      entities: 'Routed to Person 2 voice parser (src/engine/)',
      latencyMs: 8,
      reply: `Command queued: "${cleaned}"`,
    });
    onCommandSubmit?.(cleaned);
    setInputText('');
  }

  const stateMeta = STATE_COLORS[orbState];

  return (
    <section className="rounded-xl border border-slate-800 bg-[#1E293B] p-4">
      <div className="grid grid-cols-1 items-center gap-4 lg:grid-cols-12">
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-[#0F172A] p-3 lg:col-span-4">
          <button
            type="button"
            onClick={() =>
              setOrbState((prev) => (prev === 'listening' ? 'idle' : 'listening'))
            }
            title="Tap 3D Orb to toggle listening state"
            className="group relative flex items-center justify-center focus:outline-none"
          >
            <canvas ref={canvasRef} width={160} height={160} className="cursor-pointer" />
            <div className="pointer-events-none absolute flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 bg-[#0F172A]/90 text-slate-200 group-hover:border-slate-500">
              <Mic className="h-4 w-4" />
            </div>
          </button>

          <span
            className={`mt-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${stateMeta.badge}`}
          >
            {stateMeta.label}
          </span>
        </div>

        <div className="space-y-3 lg:col-span-8">
          <div className="rounded-lg border border-slate-700/80 bg-[#0F172A] p-3">
            <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-wider text-slate-400">
              <span className="flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5 text-[#10B981]" />
                Live Voice Pipeline
              </span>
              <span className="font-mono-num text-[#10B981]">
                {pipeline.latencyMs > 0 ? `${pipeline.latencyMs} ms` : 'READY'}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2 text-xs md:grid-cols-3">
              <div className="rounded border border-slate-800 bg-[#1E293B]/60 p-2">
                <p className="text-[10px] font-semibold uppercase text-slate-400">1. Raw Speech</p>
                <p className="mt-0.5 text-slate-100">{pipeline.raw}</p>
              </div>
              <div className="rounded border border-slate-800 bg-[#1E293B]/60 p-2">
                <p className="flex items-center gap-1 text-[10px] font-semibold uppercase text-slate-400">
                  <ArrowRight className="h-3 w-3" /> 2. Cleaned Entities
                </p>
                <p className="font-mono-num mt-0.5 text-[11px] text-[#F59E0B]">
                  {pipeline.entities}
                </p>
              </div>
              <div className="rounded border border-slate-800 bg-[#1E293B]/60 p-2">
                <p className="flex items-center gap-1 text-[10px] font-semibold uppercase text-slate-400">
                  <ArrowRight className="h-3 w-3" /> 3. Spoken Reply
                </p>
                <p className="mt-0.5 text-[#10B981]">{pipeline.reply}</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder='Type or speak Hinglish command (e.g. "250g jeera and 3 Maggi")...'
              className="flex-1 rounded-lg border border-slate-700 bg-[#0F172A] px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-slate-500 focus:outline-none"
            />
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-lg bg-[#10B981] px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-400"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Send</span>
            </button>
          </form>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {DEMO_CHIPS.map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => triggerChip(chip)}
                className="shrink-0 rounded-full border border-slate-700 bg-[#0F172A] px-3 py-1.5 text-xs text-slate-200 hover:border-slate-500 hover:bg-slate-800"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}