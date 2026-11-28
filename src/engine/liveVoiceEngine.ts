import { db } from '../db/database';

export interface VoiceProfile {
  id: string;
  name: string;
  role: 'Owner' | 'Cousin / Staff';
  pitchSignature: number; // Average spectral centroid (Hz)
  enrolledAt: string;
}

export interface VoiceActionResult {
  success: boolean;
  actionType: 'khata_add' | 'khata_remove' | 'saruku_add' | 'unknown';
  entities: string;
  reply: string;
  speaker: string;
  latencyMs: number;
}

export const SUPPORTED_LANGUAGES = [
  { code: 'en-IN', label: 'English / Hinglish / Tenglish' },
  { code: 'te-IN', label: 'తెలుగు (Telugu)' },
  { code: 'hi-IN', label: 'हिन्दी (Hindi)' },
  { code: 'ta-IN', label: 'தமிழ் (Tamil)' },
  { code: 'kn-IN', label: 'ಕನ್ನಡ (Kannada)' },
];

const PROFILES_KEY = 'kirana_authorized_voices_v1';
const AUDIT_KEY = 'kirana_voice_audit_v1';

export function getAuthorizedVoices(): VoiceProfile[] {
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    if (raw) return JSON.parse(raw) as VoiceProfile[];
  } catch {
    // ignore storage errors
  }
  return [
    {
      id: 'default-owner',
      name: 'Shopkeeper (Owner)',
      role: 'Owner',
      pitchSignature: 185,
      enrolledAt: new Date().toISOString(),
    },
  ];
}

export function saveAuthorizedVoice(profile: VoiceProfile): VoiceProfile[] {
  const existing = getAuthorizedVoices();
  const updated = [...existing, profile];
  localStorage.setItem(PROFILES_KEY, JSON.stringify(updated));
  return updated;
}

export function removeAuthorizedVoice(id: string): VoiceProfile[] {
  const updated = getAuthorizedVoices().filter((p) => p.id !== id);
  localStorage.setItem(PROFILES_KEY, JSON.stringify(updated));
  return updated;
}

/**
 * Captures a 2.5-second microphone sample to create a lightweight vocal pitch
 * signature for the Shopkeeper or a trusted Cousin/Helper.
 */
export async function captureVoiceSignature(): Promise<number> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioCtx = new AudioCtx();
  const source = audioCtx.createMediaStreamSource(stream);
  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 1024;
  source.connect(analyser);

  const data = new Uint8Array(analyser.frequencyBinCount);
  const samples: number[] = [];

  await new Promise<void>((resolve) => {
    const start = performance.now();
    const sampleLoop = () => {
      analyser.getByteFrequencyData(data);
      let weightedSum = 0;
      let magnitudeSum = 0;
      for (let i = 2; i < 120; i++) {
        weightedSum += i * data[i];
        magnitudeSum += data[i];
      }
      if (magnitudeSum > 400) {
        const binHz = audioCtx.sampleRate / analyser.fftSize;
        samples.push((weightedSum / magnitudeSum) * binHz);
      }
      if (performance.now() - start < 2400) {
        requestAnimationFrame(sampleLoop);
      } else {
        resolve();
      }
    };
    sampleLoop();
  });

  stream.getTracks().forEach((t) => t.stop());
  await audioCtx.close();

  if (samples.length === 0) return 190;
  const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
  return Math.round(avg);
}

export function speakReply(text: string, langCode: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = langCode;
  utter.rate = 1.02;
  window.speechSynthesis.speak(utter);
}

function logVoiceAudit(speaker: string, text: string, action: string) {
  try {
    const prev = JSON.parse(localStorage.getItem(AUDIT_KEY) || '[]') as Array<{
      speaker: string;
      text: string;
      action: string;
      at: string;
    }>;
    const next = [{ speaker, text, action, at: new Date().toLocaleTimeString() }, ...prev].slice(
      0,
      20
    );
    localStorage.setItem(AUDIT_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

/**
 * Parses multilingual commands (English, Telugu/Tenglish, Hindi/Hinglish)
 * and updates Dexie IndexedDB directly.
 */
export async function executeVoiceCommand(
  rawText: string,
  speakerName: string
): Promise<VoiceActionResult> {
  const start = performance.now();
  const text = rawText.trim();
  const lower = text.toLowerCase();

  const [customers, products] = await Promise.all([
    db.customers.toArray(),
    db.products.toArray(),
  ]);

  // 1. CHECK SARUKU / OUT-OF-STOCK COMMANDS
  // Triggers on Telugu ("ayipoyindi", "ledu", "ledhu", "thisukuravali", "saruku"),
  // Hindi ("khatam", "nahi hai", "lana hai"), or English ("finished", "out of stock", "over", "restock")
  const sarukuKeywords = [
    'ayipoyindi',
    'ayyindi',
    'ayyiya',
    'ledu',
    'ledhu',
    'thisukuravali',
    'saruku',
    'khatam',
    'nahi hai',
    'lana hai',
    'finished',
    'out of stock',
    'no stock',
    'restock',
    'over',
    'empty',
    'అయిపోయింది',
    'లేదు',
    'సరుకు',
    'खत्म',
  ];

  const isSarukuIntent = sarukuKeywords.some((kw) => lower.includes(kw));

  if (isSarukuIntent) {
    // Try matching an existing product by name or alias
    const matchedProduct = products.find((p) => {
      if (lower.includes(p.name.toLowerCase())) return true;
      return (p.aliases ?? []).some((a) => lower.includes(a.toLowerCase()));
    });

    if (matchedProduct && matchedProduct.id !== undefined) {
      await db.products.update(matchedProduct.id, { stock: 0 });
      const reply = `${matchedProduct.name} marked out of stock and added to Saruku List (logged by ${speakerName}).`;
      logVoiceAudit(speakerName, text, `Saruku: ${matchedProduct.name}`);
      return {
        success: true,
        actionType: 'saruku_add',
        entities: `intent: addSaruku | item: ${matchedProduct.name} | stock -> 0 | by: ${speakerName}`,
        reply,
        speaker: speakerName,
        latencyMs: Math.max(4, Math.round(performance.now() - start)),
      };
    }

    // If item is not yet in DB, extract item name and add it to Saruku list (stock: 0)
    let extractedItem = text;
    for (const kw of sarukuKeywords) {
      extractedItem = extractedItem.replace(new RegExp(kw, 'gi'), '');
    }
    extractedItem = extractedItem
      .replace(/\b(shop|lo|in|the|is|item|items|add|to|list|remind|chestadhi|ante|antey|adhi)\b/gi, '')
      .trim();

    if (extractedItem.length >= 2) {
      const cleanName =
        extractedItem.charAt(0).toUpperCase() + extractedItem.slice(1);
      await db.products.add({
        name: cleanName,
        selling_price: 0,
        wholesale_cost: 0,
        unit: 'kg',
        stock: 0,
        low_stock_threshold: 2,
        aliases: [extractedItem.toLowerCase()],
      });
      const reply = `Added new item "${cleanName}" to your Saruku Restock List (logged by ${speakerName}).`;
      logVoiceAudit(speakerName, text, `New Saruku: ${cleanName}`);
      return {
        success: true,
        actionType: 'saruku_add',
        entities: `intent: addNewSaruku | item: ${cleanName} | stock: 0 | by: ${speakerName}`,
        reply,
        speaker: speakerName,
        latencyMs: Math.max(4, Math.round(performance.now() - start)),
      };
    }
  }

  // 2. CHECK KHATA ADD / REMOVE MONEY COMMANDS
  const amountMatch = lower.match(/(?:₹|rs\.?|rupees?)?\s*(\d+(?:\.\d+)?)/);
  const amount = amountMatch ? Number(amountMatch[1]) : 0;

  if (amount > 0) {
    const removeKeywords = [
      'remove',
      'minus',
      'deduct',
      'paid',
      'pay',
      'received',
      'clear',
      'less',
      'ichadu',
      'icchadu',
      'theeyi',
      'teeseyi',
      'jama',
      'kat',
      'diya',
      'ఇచ్చాడు',
      'తీసేయి',
      'जमा',
      'दिया',
    ];
    const isRemove = removeKeywords.some((kw) => lower.includes(kw));

    // Find matching customer by first name or full name
    const matchedCustomer = customers.find((c) => {
      const full = c.name.toLowerCase();
      const firstWord = full.split(' ')[0];
      return lower.includes(full) || (firstWord.length >= 3 && lower.includes(firstWord));
    });

    if (matchedCustomer && matchedCustomer.id !== undefined) {
      const newBalance = isRemove
        ? Math.max(0, matchedCustomer.khata_balance - amount)
        : matchedCustomer.khata_balance + amount;

      await db.customers.update(matchedCustomer.id, {
        khata_balance: newBalance,
      });

      const verb = isRemove ? 'Removed' : 'Added';
      const reply = `${verb} ₹${amount} ${isRemove ? 'from' : 'to'} ${matchedCustomer.name}'s Khata. New balance is ₹${newBalance} (by ${speakerName}).`;
      logVoiceAudit(speakerName, text, `${verb} ₹${amount} (${matchedCustomer.name})`);

      return {
        success: true,
        actionType: isRemove ? 'khata_remove' : 'khata_add',
        entities: `intent: ${isRemove ? 'khataRemove' : 'khataAdd'} | customer: ${matchedCustomer.name} | ₹${amount} | balance: ₹${newBalance}`,
        reply,
        speaker: speakerName,
        latencyMs: Math.max(4, Math.round(performance.now() - start)),
      };
    }
  }

  return {
    success: false,
    actionType: 'unknown',
    entities: `heard: "${text}" | speaker: ${speakerName}`,
    reply:
      'Try saying: "Add 200 to Sharma ji khata", "Remove 100 from Sharma ji", or "Sugar ayipoyindi" / "Oil finished".',
    speaker: speakerName,
    latencyMs: Math.max(4, Math.round(performance.now() - start)),
  };
}