# Kirana Store Ambient Voice Co-Pilot

An offline-first, two-way conversational voice co-pilot for Indian neighborhood kirana stores and micro-merchants. It turns an existing budget Android smartphone and counter speaker or Bluetooth earpiece into a hands-free store manager during rush hours—with zero paid API keys required to run locally[cite: 1, 2, 3, 10].

## Problem & Why Voice Matters
During busy counter hours, shopkeepers' hands are occupied weighing, scooping, and packing items while handling multiple customers and code-mixed speech (such as Hindi/Telugu with English product names)[cite: 1, 2, 4].

* **UPI Fraud & Verification Delays:** Passive soundboxes only announce alerts, while fake payment screenshots or slow-network claims slow down the counter when vendors cannot stop packing to check multiple UPI apps[cite: 1, 3].
* **Manual Khata & Billing Friction:** Paper ledgers get miscalculated or lost, and screen typing breaks flow—especially on fractional weights where mental math errors cut into thin 8–12% margins[cite: 1, 3].
* **Margin, Stock & Expiry Losses:** Fluctuating wholesale rates make bargaining harder, fast-moving stockouts go unnoticed, and near-expiry dairy or packaged goods cause direct loss[cite: 1, 2, 3].

## Core Modules & Six Voice Tools
* **Two-Way UPI & Fake-Screenshot Shield (`verifyUpiPayment`):** Checks recent payments (last 5 minutes), confirms verified matches (`sender`, `amount`, `app`, elapsed time, UTR) with a 1-tap **Deduct from Khata** action (no silent auto-deduction), and triggers a **Fraud Alert** for missing, fake, failed, or unverified claims[cite: 3, 11].
* **Zero-Touch Voice Khata (`logKhata` & `sendWhatsAppReminder`):** Handles code-mixed phrases, Hindi/Telugu/English aliases, and fractional quantities (`paav`, `aadha`, `pauna`, `dedh`, grams) with idempotent client transaction IDs, stock deduction, and polite `wa.me` WhatsApp payment reminders (never auto-sent)[cite: 2, 3, 10, 11].
* **Rush-Hour Verbal Calculator (`calculateQuickBill`):** Supports multi-item and fractional-weight billing across `Counter A/B` baskets, settles via Cash, UPI, or Khata, saves receipts, deducts stock once, and flags low stock[cite: 3, 11, 12].
* **Silent Stockout & Expiry Radar (`checkInventory`):** Tracks `low_stock`, `expiring_soon` (24–48h), and `log_expiry`, generating WhatsApp distributor restock text[cite: 3, 4, 11].
* **Wholesale Margin & Rate Memory (`getWholesaleRate`):** Surfaces cost price, wholesale floor (`Math.ceil(wholesale_cost * 1.08)`), and margin discreetly for bargaining[cite: 4, 11].

## Stack & Offline Architecture
* **Frontend:** React, TypeScript, Tailwind CSS, Framer Motion, and Lucide React[cite: 10].
* **Offline Storage & Sync:** Dexie.js (IndexedDB) with `UpgradeError` auto-recovery, offline mutation queuing by unique `client_tx_id` with deduplicated local flush on reconnect, and `BroadcastChannel` (`localStorage` fallback) sync across views/tabs including `?view=simulator`[cite: 10].
* **Voice & Audio:** Web Speech API (`en-IN` with timeout and auto-recovery), optional Wispr Flow WebSocket adapter, hybrid local token/regex parser (resolving fillers and self-corrections like `"2 kg, actually 3"`) with optional Gemini JSON fallback (`localStorage` key and model ID), Web Audio earcons, and `SpeechSynthesis` fallback[cite: 10, 11].
* **Payment Simulation vs. Android Listener:** Browser mode uses a simulated payment event generator (`VERIFIED`, `FAKE`, `FAILED`, `UNKNOWN`) clearly labeled as demo data[cite: 8, 10, 12]. Real Android `NotificationListenerService` integration is a later prototype step rather than a first-demo blocker[cite: 5, 8, 9].

## Team Roles (Team Astra)
* **Person 1 — App + Local Data:** Android/app shell, local product catalog, Khata/bill screens, and offline storage (`Room` / SQLite / Dexie)[cite: 3, 6, 10].
* **Person 2 — Voice + AI:** Code-mixed sample phrases, strict JSON action schemas, intent routing, fallback handling, and optional Indic voice/LLM adapters[cite: 4, 7, 10, 11].
* **Person 3 — Payment Demo + Integration:** Simulated payment events (`Suresh Kumar` / `₹340` presets, real vs. fake screenshot controls), payment verification integration, demo script, and Android `NotificationListenerService` notes[cite: 8, 9, 10, 12].

## First Working Demo Flow
1. Run a **quick bill** with fractional/multi-item quantities and settle it[cite: 5, 11].
2. **Log or inspect a Khata entry** (such as `Sharma ji`) and confirm the local balance updates[cite: 5, 11].
3. **Check inventory, expiry, or wholesale buying rate** (such as `Toor Dal` or `Jeera`)[cite: 3, 4, 11].
4. **Test UPI verification:** Check `₹340` from `Suresh` before sending to trigger a **Fraud Alert**, send the simulated `₹340` `Suresh Kumar` payment in the simulator, re-check to verify **VERIFIED**, and use **1-Tap Deduct from Khata**[cite: 11, 12].

## Git & Repo Hygiene
* Work on a dedicated feature branch off `main`, push changes, and open a Pull Request for teammate review[cite: 9].
* Never commit API keys, passwords, or real customer or payment data[cite: 9, 12].
