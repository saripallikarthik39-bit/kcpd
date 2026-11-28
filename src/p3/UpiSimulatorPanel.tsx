import React, { useState } from "react";
import {
  type FakeReceiptPreview,
  type PaymentEventStatus,
  SIMULATOR_PRESETS,
  type UpiApp,
  type UpiSimulationEvent,
  broadcastSimulatedEvent,
  createFakeScreenshotPreview,
  createSimulatedUpiEvent
} from "./paymentSimulator";

interface UpiSimulatorPanelProps {
  onRecordEvent?: (event: UpiSimulationEvent) => void;
  onDeductKhata?: (customerName: string, amount: number, utr: string) => void;
}

export const UpiSimulatorPanel: React.FC<UpiSimulatorPanelProps> = ({
  onRecordEvent,
  onDeductKhata
}) => {
  const [sender, setSender] = useState("Suresh Kumar");
  const [amount, setAmount] = useState<string>("340");
  const [app, setApp] = useState<UpiApp>("PhonePe");
  const [status, setStatus] = useState<PaymentEventStatus>("VERIFIED");
  const [lastBroadcast, setLastBroadcast] = useState<UpiSimulationEvent | null>(null);
  const [fakePreview, setFakePreview] = useState<FakeReceiptPreview | null>(null);

  const numericAmount = Math.max(0, Number(amount) || 0);

  const handleSendRealSimulatedPayment = () => {
    setFakePreview(null);
    const ev = createSimulatedUpiEvent({ sender, amount: numericAmount, app, status: "VERIFIED" });
    setLastBroadcast(ev);
    broadcastSimulatedEvent(ev);
    onRecordEvent?.(ev);
  };

  const handleShowFakeScreenshot = () => {
    const preview = createFakeScreenshotPreview({ sender, amount: numericAmount, app });
    setFakePreview(preview);
  };

  const handleEmitSelectedStatus = () => {
    if (status === "FAKE") {
      handleShowFakeScreenshot();
      return;
    }
    setFakePreview(null);
    const ev = createSimulatedUpiEvent({ sender, amount: numericAmount, app, status });
    setLastBroadcast(ev);
    broadcastSimulatedEvent(ev);
    onRecordEvent?.(ev);
  };

  return (
    <section aria-label="UPI Payment Simulator" className="rounded-lg border border-slate-700 bg-slate-900 p-4 text-slate-100">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">UPI Payment Simulator</h2>
          <p className="text-xs text-amber-400">Browser simulation of Android NotificationListenerService (Demo Data Only)</p>
        </div>
        <span className="rounded border border-slate-600 px-2 py-0.5 font-mono text-xs text-slate-300">SIMULATION MODE</span>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {SIMULATOR_PRESETS.map((preset) => (
          <button
            key={preset.title}
            type="button"
            onClick={() => {
              setSender(preset.sender);
              setAmount(String(preset.amount));
              setApp(preset.app);
              setStatus(preset.status);
            }}
            className="rounded border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs hover:border-slate-500"
          >
            {preset.title}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <label className="text-xs">
          <span className="mb-1 block text-slate-400">Payer / Sender</span>
          <input type="text" value={sender} onChange={(e) => setSender(e.target.value)} className="w-full rounded border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-sm text-white" />
        </label>
        <label className="text-xs">
          <span className="mb-1 block text-slate-400">Amount (INR)</span>
          <input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full rounded border border-slate-700 bg-slate-800 px-2.5 py-1.5 font-mono text-sm tabular-nums text-white" />
        </label>
        <label className="text-xs">
          <span className="mb-1 block text-slate-400">App / Source</span>
          <select value={app} onChange={(e) => setApp(e.target.value as UpiApp)} className="w-full rounded border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-sm text-white">
            <option value="PhonePe">PhonePe</option>
            <option value="GPay">GPay</option>
            <option value="Paytm">Paytm</option>
            <option value="Bank SMS">Bank SMS</option>
          </select>
        </label>
        <label className="text-xs">
          <span className="mb-1 block text-slate-400">Event Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value as PaymentEventStatus)} className="w-full rounded border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-sm text-white">
            <option value="VERIFIED">VERIFIED (Received)</option>
            <option value="FAKE">FAKE (Forged Screenshot)</option>
            <option value="FAILED">FAILED</option>
            <option value="UNKNOWN">UNKNOWN</option>
          </select>
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={handleSendRealSimulatedPayment} className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500">
          Send REAL UPI Payment (Simulated)
        </button>
        <button type="button" onClick={handleShowFakeScreenshot} className="rounded bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500">
          Show FAKE Screenshot (Unverified)
        </button>
        <button type="button" onClick={handleEmitSelectedStatus} className="rounded border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-700">
          Emit Selected ({status})
        </button>
      </div>

      {lastBroadcast && (
        <div className="mt-4 rounded border border-emerald-700/60 bg-slate-800/90 p-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-emerald-400">{lastBroadcast.label}</span>
            <span className="font-mono tabular-nums text-slate-300">UTR: {lastBroadcast.transaction_id}</span>
          </div>
          <p className="mt-1 font-mono tabular-nums text-slate-200">
            {lastBroadcast.sender} | Rs {lastBroadcast.amount} | {lastBroadcast.app} | {lastBroadcast.status}
          </p>
          {lastBroadcast.status === "VERIFIED" && onDeductKhata && (
            <button
              type="button"
              onClick={() => onDeductKhata(lastBroadcast.sender, lastBroadcast.amount, lastBroadcast.transaction_id)}
              className="mt-2 rounded bg-emerald-700 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-600"
            >
              1-Tap Deduct from Khata
            </button>
          )}
        </div>
      )}

      {fakePreview && (
        <div className="mt-4 rounded border border-rose-700 bg-rose-950/50 p-3 text-xs">
          <div className="font-semibold text-rose-300">SIMULATED FAKE RECEIPT PREVIEW - NOT BANK-CONFIRMED</div>
          <p className="mt-1 font-mono tabular-nums text-rose-100">
            Claimed: Rs {fakePreview.amount} from {fakePreview.sender} ({fakePreview.app}) | Claimed Ref: {fakePreview.utr_claimed}
          </p>
          <p className="mt-1 text-rose-200">{fakePreview.warning}</p>
        </div>
      )}
    </section>
  );
};
