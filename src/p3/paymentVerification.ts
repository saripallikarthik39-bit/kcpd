import type{ UpiSimulationEvent } from "./paymentSimulator";

export interface PaymentCheckResult {
  outcome: "VERIFIED" | "FRAUD_ALERT" | "FAILED_EVENT" | "UNKNOWN_EVENT";
  headline: string;
  detail: string;
  matchedEvent?: UpiSimulationEvent;
  canDeductKhata: boolean;
  isSimulated: boolean;
}

export function evaluatePaymentCheck(params: {
  senderQuery: string;
  amountQuery: number;
  events: UpiSimulationEvent[];
  windowMinutes?: number;
  nowMs?: number;
}): PaymentCheckResult {
  const windowMinutes = params.windowMinutes ?? 5;
  const nowMs = params.nowMs ?? Date.now();
  const maxAgeMs = windowMinutes * 60 * 1000;
  const normalizedSender = params.senderQuery.trim().toLowerCase();

  const recentMatches = params.events.filter((ev) => {
    const ageMs = nowMs - new Date(ev.received_at).getTime();
    const withinWindow = ageMs >= 0 && ageMs <= maxAgeMs;
    const senderMatches =
      !normalizedSender ||
      ev.sender.toLowerCase().includes(normalizedSender) ||
      normalizedSender.includes(ev.sender.toLowerCase());
    const amountMatches = Math.abs(Number(ev.amount) - Number(params.amountQuery)) < 0.01;
    return withinWindow && senderMatches && amountMatches;
  });

  const verifiedMatch = recentMatches.find((ev) => ev.status === "VERIFIED");
  if (verifiedMatch) {
    const elapsedSec = Math.max(1, Math.round((nowMs - new Date(verifiedMatch.received_at).getTime()) / 1000));
    return {
      outcome: "VERIFIED",
      headline: `VERIFIED: Rs ${verifiedMatch.amount} from ${verifiedMatch.sender} via ${verifiedMatch.app}`,
      detail: `Simulated event (${elapsedSec}s ago) | UTR: ${verifiedMatch.transaction_id}`,
      matchedEvent: verifiedMatch,
      canDeductKhata: true,
      isSimulated: true
    };
  }

  const failedMatch = recentMatches.find((ev) => ev.status === "FAILED");
  if (failedMatch) {
    return {
      outcome: "FAILED_EVENT",
      headline: `FAILED PAYMENT: Rs ${failedMatch.amount} from ${failedMatch.sender}`,
      detail: `Simulated ${failedMatch.app} attempt failed (UTR: ${failedMatch.transaction_id}). Not bank-confirmed.`,
      matchedEvent: failedMatch,
      canDeductKhata: false,
      isSimulated: true
    };
  }

  const unknownMatch = recentMatches.find((ev) => ev.status === "UNKNOWN");
  if (unknownMatch) {
    return {
      outcome: "UNKNOWN_EVENT",
      headline: `UNVERIFIED / UNKNOWN SENDER: Rs ${unknownMatch.amount}`,
      detail: `Simulated ${unknownMatch.app} entry (${unknownMatch.sender}) lacks verified customer match.`,
      matchedEvent: unknownMatch,
      canDeductKhata: false,
      isSimulated: true
    };
  }

  return {
    outcome: "FRAUD_ALERT",
    headline: `FRAUD ALERT: No verified Rs ${params.amountQuery} from ${params.senderQuery || "sender"} in last ${windowMinutes}m`,
    detail: "Simulated check found no confirmed payment. Do not hand over goods or deduct Khata without verification.",
    canDeductKhata: false,
    isSimulated: true
  };
}
