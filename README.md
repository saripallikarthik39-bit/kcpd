# Kirana Store Ambient Counter Co-Pilot

Offline-first voice counter co-pilot for Indian micro-merchants (billing, customer khata, inventory, and simulated UPI checks).

## Quick Start (Person 1 Setup)

```bash
npm install
npm run dev
```

Open the local URL printed by Vite (default: `http://localhost:5173`).

## Shared Data Contract (For Person 2 & Person 3)

- **Shared TypeScript interfaces:** `src/types/store.ts` (`Product`, `Customer`, `LineItem`, `KhataTransaction`, `UpiEvent`, `Bill`)
- **Offline Database (Dexie.js / IndexedDB):** `src/db/database.ts` (`db.products`, `db.customers`, `db.khata_transactions`, `db.upi_events`, `db.bills`)
- **Seed Data & Reset Helper:** `src/db/seed.ts` (9 SKUs with Hinglish/Telugu aliases, 3 fictional Khata customers, 2 initial simulated UPI events)
- **Offline Mutation Queue:** `src/db/offlineQueue.ts` (`addKhataEntry` with `client_tx_id` deduplication, `flushOfflineQueue`)

## Team Roles

- **Person 1:** App shell, dark fintech Counter HUD, and offline Dexie.js data layer
- **Person 2:** Voice engine and AI intent/tool routing (`src/engine/`)
- **Person 3:** Simulated UPI payment generator and end-to-end integration (`src/p3/`)