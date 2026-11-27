export type UpiApp = "PhonePe" | "GPay" | "Paytm" | "Bank SMS";
export type PaymentEventStatus = "VERIFIED" | "FAKE" | "FAILED" | "UNKNOWN";

export interface UpiSimulationEvent {
  id: string;
  sender: string;
  amount: number;
  app: UpiApp;
  transaction_id: string;
  status: PaymentEventStatus;
  received_at: string;
  is_simulated: true;
  label: string;
}

export interface FakeReceiptPreview {
  sender: string;
  amount: number;
  app: UpiApp;
  utr_claimed: string;
  shown_at: string;
  is_simulated: true;
  warning: string;
}

const CHANNEL_NAME = "kirana_copilot_upi_sim_v1";
const STORAGE_KEY = "kirana_copilot_upi_sim_last_event";

export const SIMULATOR_PRESETS: Array<{
  title: string;
  sender: string;
  amount: number;
  app: UpiApp;
  status: PaymentEventStatus;
}> = [
  { title: "Suresh Kumar - Rs 340 (PhonePe)", sender: "Suresh Kumar", amount: 340, app: "PhonePe", status: "VERIFIED" },
  { title: "Suresh Kumar - Rs 340 (Fake Screenshot)", sender: "Suresh Kumar", amount: 340, app: "GPay", status: "FAKE" },
  { title: "Kiran Traders - Rs 210 (Failed)", sender: "Kiran Traders", amount: 210, app: "Paytm", status: "FAILED" },
  { title: "Unknown Sender - Rs 150", sender: "Unknown Payer", amount: 150, app: "Bank SMS", status: "UNKNOWN" }
];

function generateDemoUtr(prefix: string): string {
  const rand = Math.floor(100000000000 + Math.random() * 900000000000);
  return `${prefix}${rand}`;
}

export function createSimulatedUpiEvent(params: {
  sender: string;
  amount: number;
  app: UpiApp;
  status: PaymentEventStatus;
}): UpiSimulationEvent {
  const cleanSender = params.sender.trim() || "Unknown Payer";
  const cleanAmount = Number(params.amount) || 0;
  const statusTag =
    params.status === "VERIFIED"
      ? "SIMULATED VERIFIED PAYMENT"
      : params.status === "FAKE"
      ? "SIMULATED FAKE SCREENSHOT (NOT BANK-CONFIRMED)"
      : params.status === "FAILED"
      ? "SIMULATED FAILED PAYMENT"
      : "SIMULATED UNKNOWN PAYMENT";

  return {
    id: `sim_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    sender: cleanSender,
    amount: cleanAmount,
    app: params.app,
    transaction_id: generateDemoUtr("SIMUTR"),
    status: params.status,
    received_at: new Date().toISOString(),
    is_simulated: true,
    label: statusTag
  };
}

export function createFakeScreenshotPreview(params: {
  sender: string;
  amount: number;
  app: UpiApp;
}): FakeReceiptPreview {
  return {
    sender: params.sender.trim() || "Suresh Kumar",
    amount: Number(params.amount) || 340,
    app: params.app,
    utr_claimed: generateDemoUtr("FAKE"),
    shown_at: new Date().toISOString(),
    is_simulated: true,
    warning: "Simulated fake screenshot only - zero verified payment broadcast; do not mark as bank-confirmed."
  };
}

export function broadcastSimulatedEvent(event: UpiSimulationEvent): void {
  const payload = JSON.stringify({ type: "UPI_SIM_EVENT", event });
  if (typeof window !== "undefined" && "BroadcastChannel" in window) {
    const bc = new BroadcastChannel(CHANNEL_NAME);
    bc.postMessage(payload);
    bc.close();
  }
  if (typeof window !== "undefined" && window.localStorage) {
    window.localStorage.setItem(STORAGE_KEY, payload);
  }
}

export function subscribeSimulatedEvents(onEvent: (event: UpiSimulationEvent) => void): () => void {
  let bc: BroadcastChannel | null = null;
  const handleRaw = (raw: unknown) => {
    try {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (parsed?.type === "UPI_SIM_EVENT" && parsed?.event?.is_simulated) {
        onEvent(parsed.event as UpiSimulationEvent);
      }
    } catch {
      // Ignore malformed simulator payloads
    }
  };
  if (typeof window !== "undefined" && "BroadcastChannel" in window) {
    bc = new BroadcastChannel(CHANNEL_NAME);
    bc.onmessage = (msg) => handleRaw(msg.data);
  }
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      handleRaw(e.newValue);
    }
  };
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }
  return () => {
    if (bc) bc.close();
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}
