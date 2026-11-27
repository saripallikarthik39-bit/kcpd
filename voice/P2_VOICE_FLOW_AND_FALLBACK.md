# Person 2 — Voice Flow, Validation & Fallback Notes

## 1. End-to-End Voice Flow
1. **Input Sources:** Microphone (`Web Speech API` in `en-IN` with 6s timeout), quick-test chips, and manual text box all pass into one single function: `processVoiceCommand(transcript)`.
2. **Local Normalization (Offline, < 15ms):**
   - Strips spoken filler words (`uh`, `um`, `bhaiya`).
   - Maps Hinglish/Telugu aliases (`chini`, `panchadara`, `jeelakarra`, `doodh`, `paalu`, `pappu`) and phonetic typos (`tour dal`, `jira`, `sharma g`).
   - Converts spoken fractions (`paav` = 0.25, `aadha` = 0.5, `pauna` = 0.75, `dedh` = 1.5, grams to kg).
   - Resolves self-corrections (`"2 kg sugar, actually 3"` -> `3 kg Sugar`).
3. **Hybrid Parsing + Strict Validation Gate:**
   - Primary parser runs locally with deterministic rules so core commands work offline with zero API keys.
   - Optional LLM fallback (Gemini JSON mode) runs only if local parsing returns `unknown` and an API key is set in local device settings (never committed to GitHub).
   - Every parsed action passes through `validateAction()` before Person 1's storage layer can save or deduct anything.
4. **Spoken & Visual Output:**
   - Primary voice output: Gnani.AI Indic voice (when API access is confirmed) or browser/Android `SpeechSynthesis`.
   - Always displays `fallback_text` and structured card data on screen alongside audio.

## 2. Failure & Fallback Rules
| Situation | System Behavior | Shopkeeper Sees / Hears |
|---|---|---|
| **Unclear request** (e.g., khata without customer name) | Sets `status: "needs_clarification"`, blocks database write. | Asks one short clarifying question: *"Which customer's khata should I add this to?"* |
| **Unknown product** | Blocks partial save so corrupted items are never logged. | *"I could not find that product in the store catalog. Please repeat the item name."* |
| **API or internet unavailable** | Automatically uses local `voice_parser.js` and skips cloud LLM/TTS calls. | Validated action still runs offline; response displays as readable `fallback_text`. |
| **Audio / Mic unavailable** | Shopkeeper taps preset demo chips or types into the input box. | Runs through the exact same `processVoiceCommand()` pipeline with visible card output. |
| **Invalid or out-of-stock quantity** | Rejects zero/negative numbers or quantities above stock count. | Displays warning with current available stock before any change is saved. |

## 3. Team Handoff Checklist
- **To Person 1:** Confirm catalog field names (`name`, `unit`, `selling_price`, `wholesale_cost`, `stock`) and `client_tx_id` match `voice/action_schemas.json`.
- **To Person 3:** Confirm `verify_upi_payment` reads `sender`, `amount`, `app`, `status`, and `received_at` from simulated UPI events without auto-mutating Khata.
