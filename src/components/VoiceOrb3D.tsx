import { useEffect, useRef, useState } from 'react';
import {
  Mic,
  MicOff,
  Send,
  Cpu,
  ArrowRight,
  Globe,
  UserCheck,
  ShieldAlert,
  UserPlus,
  Trash2,
} from 'lucide-react';
import {
  SUPPORTED_LANGUAGES,
  captureVoiceSignature,
  executeVoiceCommand,
  getAuthorizedVoices,
  removeAuthorizedVoice,
  saveAuthorizedVoice,
  speakReply,
  type VoiceProfile,
} from '../engine/liveVoiceEngine';

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

const QUICK_TEST_CHIPS = [
  'Add 200 to Sharma ji khata',
  'Remove 100 from Sharma ji khata',
  'Sugar ayipoyindi saruku list lo pettu',
  'Sunflower Oil finished out of stock',
];

const STATE_COLORS: Record<OrbState, { rgb: string; badge: string; label: string }> = {
  idle: { rgb: '245, 158, 11', badge: 'text-amber-300 border-amber-500/40', label: 'Tap Mic to Speak' },
  listening: { rgb: '251, 146, 60', badge: 'text-orange-300 border-orange-500/50', label: 'Listening Live...' },
  verified: { rgb: '16, 185, 129', badge: 'text-emerald-300 border-emerald-500/50', label: 'Saved to Shop DB' },
  fraud: { rgb: '244, 63, 94', badge: 'text-rose-300 border-rose-500/50', label: 'Check / Alert' },
  earpiece: { rgb: '217, 70, 239', badge: 'text-fuchsia-300 border-fuchsia-500/50', label: 'Private Earpiece' },
};

interface SpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export function VoiceOrb3D({ audioMode, onCommandSubmit }: VoiceOrb3DProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const [orbState, setOrbState] = useState<OrbState>(audioMode === 'earpiece' ? 'earpiece' : 'idle');
  const [isListening, setIsListening] = useState(false);
  const [selectedLang, setSelectedLang] = useState('en-IN');
  const [inputText, setInputText] = useState('');

  // Authorized Shopkeeper & Cousin Voice Profiles
  const [profiles, setProfiles] = useState<VoiceProfile[]>(() => getAuthorizedVoices());
  const [activeSpeakerId, setActiveSpeakerId] = useState<string>(
    () => getAuthorizedVoices()[0]?.id ?? 'default-owner'
  );
  const [rushMode, setRushMode] = useState(true);
  const [newStaffName, setNewStaffName] = useState('');
  const [enrolling, setEnrolling] = useState(false);

  const [pipeline, setPipeline] = useState<PipelinePreview>({
    raw: 'Tap the 3D Orb and speak in Telugu, Hindi, or English...',
    entities: 'Connected live to Dexie Khata & Saruku DB',
    latencyMs: 0,
    reply: 'Ready for shopkeeper or authorized cousin voice.',
  });

  const activeSpeaker =
    profiles.find((p) => p.id === activeSpeakerId) ?? profiles[0];

  // 60fps 3D Fibonacci Sphere Projection
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

      const speed = orbState === 'listening' ? 0.036 : orbState === 'fraud' ? 0.045 : 0.014;
      angleY += speed;
      angleX += speed * 0.35;
      pulse += orbState === 'idle' ? 0.03 : 0.12;

      const baseRadius = 52 + Math.sin(pulse) * (orbState === 'idle' ? 2 : 7);
      const cx = width / 2;
      const cy = height / 2;
      const rgb = STATE_COLORS[orbState].rgb;

      const cosY = Math.cos(angleY);
      const sinY = Math.sin(angleY);
      const cosX = Math.cos(angleX);
      const sinX = Math.sin(angleX);

      ctx.beginPath();
      ctx.strokeStyle = `rgba(${rgb}, 0.25)`;
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

  async function processCommand(transcript: string) {
    const speakerLabel = activeSpeaker
      ? `${activeSpeaker.name} (${activeSpeaker.role})`
      : 'Shopkeeper';

    const result = await executeVoiceCommand(transcript, speakerLabel);
    setOrbState(result.success ? 'verified' : 'fraud');
    setPipeline({
      raw: transcript,
      entities: result.entities,
      latencyMs: result.latencyMs,
      reply: result.reply,
    });
    speakReply(result.reply, selectedLang);
    onCommandSubmit?.(result.reply);
  }

  function toggleLiveMic() {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      setOrbState('idle');
      return;
    }

    const SpeechRec =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionInstance })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionInstance })
        .webkitSpeechRecognition;

    if (!SpeechRec) {
      setOrbState('fraud');
      setPipeline({
        raw: 'Browser microphone API not supported here',
        entities: 'Use Chrome on laptop/Android or type below',
        latencyMs: 0,
        reply: 'Switch to Google Chrome for live multilingual voice recognition.',
      });
      return;
    }

    const recognition = new SpeechRec();
    recognition.lang = selectedLang;
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onresult = (event) => {
      const spoken = event.results[0]?.[0]?.transcript ?? '';
      setIsListening(false);
      if (spoken) {
        void processCommand(spoken);
      }
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      setOrbState('fraud');
      setPipeline({
        raw: `Mic error: ${event.error}`,
        entities: 'Check Chrome mic permission (lock icon in address bar)',
        latencyMs: 0,
        reply: 'Allow microphone permission in Chrome and tap the 3D Orb again.',
      });
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    setIsListening(true);
    setOrbState('listening');
    recognition.start();
  }

  async function handleEnrollVoice(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = newStaffName.trim();
    if (!cleaned) return;
    setEnrolling(true);
    try {
      const pitch = await captureVoiceSignature();
      const updated = saveAuthorizedVoice({
        id: `staff-${Date.now()}`,
        name: cleaned,
        role: 'Cousin / Staff',
        pitchSignature: pitch,
        enrolledAt: new Date().toISOString(),
      });
      setProfiles(updated);
      setActiveSpeakerId(updated[updated.length - 1].id);
      setNewStaffName('');
      onCommandSubmit?.(`Enrolled trusted voice for ${cleaned} (${pitch} Hz signature).`);
    } catch {
      onCommandSubmit?.('Allow microphone access to enroll a trusted helper voice.');
    } finally {
      setEnrolling(false);
    }
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = inputText.trim();
    if (!cleaned) return;
    setInputText('');
    void processCommand(cleaned);
  }

  const stateMeta = STATE_COLORS[orbState];

  return (
    <div className="space-y-4">
      {/* Main Live Voice Card */}
      <section className="rounded-2xl border border-amber-500/25 bg-zinc-950/75 p-5 backdrop-blur-xl">
        {/* Top Bar: Language + Rush Mode */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/15 pb-3">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-amber-400" />
            <select
              value={selectedLang}
              onChange={(e) => setSelectedLang(e.target.value)}
              className="rounded-lg border border-amber-500/30 bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-white focus:border-amber-400 focus:outline-none"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setRushMode((prev) => !prev)}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold ${
              rushMode
                ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                : 'border-zinc-700 bg-zinc-900 text-stone-400'
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>
              {rushMode
                ? 'Shop Rush Filter ON (Authorized Voices Only)'
                : 'Shop Rush Filter OFF'}
            </span>
          </button>
        </div>

        <div className="grid grid-cols-1 items-center gap-4 lg:grid-cols-12">
          {/* Left: Live 3D Mic Orb */}
          <div className="flex flex-col items-center justify-center rounded-xl border border-amber-500/20 bg-zinc-900/70 p-4 lg:col-span-4">
            <button
              type="button"
              onClick={toggleLiveMic}
              className="group relative flex items-center justify-center focus:outline-none"
            >
              <canvas ref={canvasRef} width={160} height={160} className="cursor-pointer" />
              <div
                className={`pointer-events-none absolute flex h-11 w-11 items-center justify-center rounded-full border transition-all ${
                  isListening
                    ? 'border-orange-400 bg-orange-500 text-zinc-950 scale-110'
                    : 'border-amber-500/40 bg-zinc-950/90 text-amber-300 group-hover:border-amber-400'
                }`}
              >
                {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </div>
            </button>

            <span
              className={`mt-2 rounded-full border px-3 py-0.5 text-[11px] font-semibold ${stateMeta.badge}`}
            >
              {stateMeta.label}
            </span>
            <p className="mt-1 text-[10px] text-stone-400">
              Active Voice: <strong className="text-amber-300">{activeSpeaker?.name}</strong>
            </p>
          </div>

          {/* Right: Live Execution Pipeline + Input + Quick Commands */}
          <div className="space-y-3 lg:col-span-8">
            <div className="rounded-xl border border-amber-500/20 bg-zinc-900/70 p-3.5">
              <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-wider text-stone-400">
                <span className="flex items-center gap-1.5">
                  <Cpu className="h-3.5 w-3.5 text-emerald-400" />
                  Live Voice-to-DB Execution
                </span>
                <span className="font-mono-num text-emerald-400">
                  {pipeline.latencyMs > 0 ? `${pipeline.latencyMs} ms` : 'READY'}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2 text-xs md:grid-cols-3">
                <div className="rounded-lg border border-white/5 bg-zinc-950/70 p-2.5">
                  <p className="text-[10px] font-semibold uppercase text-stone-400">1. Spoken</p>
                  <p className="mt-0.5 text-stone-100">{pipeline.raw}</p>
                </div>
                <div className="rounded-lg border border-white/5 bg-zinc-950/70 p-2.5">
                  <p className="flex items-center gap-1 text-[10px] font-semibold uppercase text-stone-400">
                    <ArrowRight className="h-3 w-3" /> 2. DB Action
                  </p>
                  <p className="font-mono-num mt-0.5 text-[11px] text-amber-400">
                    {pipeline.entities}
                  </p>
                </div>
                <div className="rounded-lg border border-white/5 bg-zinc-950/70 p-2.5">
                  <p className="flex items-center gap-1 text-[10px] font-semibold uppercase text-stone-400">
                    <ArrowRight className="h-3 w-3" /> 3. Result
                  </p>
                  <p className="mt-0.5 text-emerald-400">{pipeline.reply}</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder='Type or speak: "Add 200 to Sharma ji" or "Sugar ayipoyindi"...'
                className="flex-1 rounded-xl border border-amber-500/25 bg-zinc-900/80 px-3.5 py-2 text-xs text-white placeholder:text-stone-500 focus:border-amber-400 focus:outline-none"
              />
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-zinc-950 hover:bg-amber-400"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Run</span>
              </button>
            </form>

            <div className="flex flex-wrap gap-2">
              {QUICK_TEST_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => void processCommand(chip)}
                  className="rounded-full border border-amber-500/25 bg-zinc-900/80 px-3 py-1.5 text-xs text-stone-200 hover:border-amber-400 hover:text-amber-300"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Authorized Voices: Shopkeeper + Cousins / Helpers */}
      <section className="rounded-2xl border border-amber-500/20 bg-zinc-950/75 p-5 backdrop-blur-xl">
        <div className="mb-3 flex items-center gap-2">
          <UserCheck className="h-5 w-5 text-amber-400" />
          <div>
            <h3 className="text-sm font-bold text-white">
              Authorized Shop Voices (Owner &amp; Cousins / Staff)
            </h3>
            <p className="text-[11px] text-stone-400">
              Enroll trusted family/staff voices so the shop runs smoothly even when the owner is away.
            </p>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          {profiles.map((profile) => {
            const active = profile.id === activeSpeaker?.id;
            return (
              <div
                key={profile.id}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${
                  active
                    ? 'border-amber-400 bg-amber-500/15 text-amber-200'
                    : 'border-zinc-800 bg-zinc-900/70 text-stone-300'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setActiveSpeakerId(profile.id)}
                  className="text-left"
                >
                  <p className="font-semibold">{profile.name}</p>
                  <p className="font-mono-num text-[10px] text-stone-400">
                    {profile.role} · {profile.pitchSignature} Hz
                  </p>
                </button>
                {profile.role !== 'Owner' && (
                  <button
                    type="button"
                    onClick={() => setProfiles(removeAuthorizedVoice(profile.id))}
                    className="text-stone-500 hover:text-rose-400"
                    title="Remove voice"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <form onSubmit={handleEnrollVoice} className="flex flex-wrap gap-2">
          <input
            type="text"
            value={newStaffName}
            onChange={(e) => setNewStaffName(e.target.value)}
            placeholder="Cousin or helper name (e.g. Cousin Ravi)..."
            className="flex-1 rounded-xl border border-amber-500/25 bg-zinc-900/80 px-3 py-2 text-xs text-white placeholder:text-stone-500 focus:border-amber-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={enrolling || !newStaffName.trim()}
            className="flex items-center gap-1.5 rounded-xl border border-amber-400/50 bg-amber-500/20 px-4 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/30 disabled:opacity-50"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>{enrolling ? 'Speak for 2.5s...' : 'Enroll Voice (2.5s)'}</span>
          </button>
        </form>
      </section>
    </div>
  );
}