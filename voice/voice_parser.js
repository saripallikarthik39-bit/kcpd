// Person 2 - Local Voice Command Normalizer, Parser, and Schema Validator
// Zero external dependencies and zero hardcoded demo sentences.

const PRODUCTS = [
  { name: "Sugar", unit: "kg", selling_price: 48, wholesale_cost: 41, aliases: ["sugar", "chini", "cheeni", "panchadara"] },
  { name: "Surf Excel", unit: "pack", selling_price: 120, wholesale_cost: 100, aliases: ["surf excel", "surf", "detergent"] },
  { name: "Milk", unit: "L", selling_price: 50, wholesale_cost: 44, aliases: ["milk", "doodh", "dudh", "paalu", "palu"] },
  { name: "Jeera", unit: "kg", selling_price: 400, wholesale_cost: 320, aliases: ["jeera", "jira", "jeelakarra", "cumin"] },
  { name: "Maggi", unit: "pack", selling_price: 14, wholesale_cost: 11.5, aliases: ["maggi", "maggie", "noodles"] },
  { name: "Sunflower Oil", unit: "pouch", selling_price: 135, wholesale_cost: 115, aliases: ["sunflower oil", "oil", "tel", "nune"] },
  { name: "Good Day", unit: "pack", selling_price: 20, wholesale_cost: 16.5, aliases: ["good day", "goodday", "biscuit"] },
  { name: "Atta", unit: "kg", selling_price: 45, wholesale_cost: 38, aliases: ["atta", "aata", "flour", "godhuma pindi"] },
  { name: "Toor Dal", unit: "kg", selling_price: 160, wholesale_cost: 132, aliases: ["toor dal", "tour dal", "tur dal", "kandi pappu", "pappu", "dal"] }
];

const CUSTOMERS = [
  { name: "Sharma ji", aliases: ["sharma ji", "sharma g", "sharma"] },
  { name: "Suresh Kumar", aliases: ["suresh kumar", "suresh"] },
  { name: "Ramesh", aliases: ["ramesh"] }
];

const WORD_NUMBERS = {
  paav: "0.25",
  pavu: "0.25",
  pow: "0.25",
  aadha: "0.5",
  adha: "0.5",
  ara: "0.5",
  pauna: "0.75",
  dedh: "1.5",
  oka: "1",
  ek: "1",
  rendhu: "2",
  rendu: "2",
  do: "2",
  moodu: "3",
  teen: "3"
};

let txCounter = 0;

function cleanTranscript(raw) {
  let text = String(raw || "").toLowerCase();

  // Remove punctuation that interferes with matching (keep decimals and slash for /kg)
  text = text.replace(/[₹?,!]/g, " ");
  text = text.replace(/'s\b/g, "");

  // Strip spoken fillers
  text = text.replace(/\b(uh|um|bhaiya|arre|please)\b/g, " ");

  // Replace spoken Hindi/Telugu numbers and fractions
  const words = text.split(/\s+/);
  for (let i = 0; i < words.length; i++) {
    if (WORD_NUMBERS[words[i]]) {
      words[i] = WORD_NUMBERS[words[i]];
    }
  }
  text = words.join(" ");

  // Resolve self-corrections like "2 kg sugar actually 3" -> "3 kg sugar"
  const selfCorrectionRegex =
    /(\d+(?:\.\d+)?)\s*(kg|kilo|g|gm|grams|l|liter|litre|pack|packet|pouch)?\s*([a-z\s]{0,20}?)\b(?:actually|nahi|sorry|make it|kadu)\s+(\d+(?:\.\d+)?)/g;
  text = text.replace(selfCorrectionRegex, "$4 $2 $3");

  return text.replace(/\s+/g, " ").trim();
}

function normalizeUnit(rawUnit, defaultUnit) {
  if (!rawUnit) return defaultUnit;
  if (rawUnit === "kilo" || rawUnit === "kg") return "kg";
  if (rawUnit === "g" || rawUnit === "gm" || rawUnit === "grams") return "g";
  if (rawUnit === "l" || rawUnit === "liter" || rawUnit === "litre") return "L";
  if (rawUnit === "pack" || rawUnit === "packet") return "pack";
  if (rawUnit === "pouch") return "pouch";
  return defaultUnit;
}

function findCustomer(cleanedText) {
  for (let i = 0; i < CUSTOMERS.length; i++) {
    const customer = CUSTOMERS[i];
    for (let j = 0; j < customer.aliases.length; j++) {
      if (cleanedText.indexOf(customer.aliases[j]) !== -1) {
        return customer.name;
      }
    }
  }
  return null;
}

function extractItems(cleanedText) {
  const items = [];

  for (let i = 0; i < PRODUCTS.length; i++) {
    const product = PRODUCTS[i];
    let matchedAlias = null;
    let matchIndex = -1;

    for (let j = 0; j < product.aliases.length; j++) {
      const alias = product.aliases[j];
      const regex = new RegExp("\\b" + alias + "\\b");
      const found = cleanedText.match(regex);
      if (found) {
        matchedAlias = alias;
        matchIndex = found.index;
        break;
      }
    }

    if (matchedAlias !== null) {
      const beforeText = cleanedText.slice(Math.max(0, matchIndex - 25), matchIndex).trim();
      const qtyMatch = beforeText.match(/(\d+(?:\.\d+)?)\s*(kg|kilo|g|gm|grams|l|liter|litre|pack|packet|pouch)?$/);

      let quantity = 1;
      let unit = product.unit;

      if (qtyMatch) {
        quantity = parseFloat(qtyMatch[1]);
        const parsedUnit = normalizeUnit(qtyMatch[2], product.unit);
        if (parsedUnit === "g") {
          quantity = quantity / 1000;
          unit = "kg";
        } else {
          unit = parsedUnit;
        }
      }

      // Optional spoken price override like "at 400/kg" or "at 400 per kg"
      const afterText = cleanedText.slice(matchIndex + matchedAlias.length, matchIndex + matchedAlias.length + 25);
      const priceMatch = afterText.match(/\bat\s+(\d+(?:\.\d+)?)\s*(?:\/|per\s+)?(?:kg|l|pack|pouch)?/);
      const overridePrice = priceMatch ? parseFloat(priceMatch[1]) : null;

      items.push({
        product_name: product.name,
        quantity: quantity,
        unit: unit,
        override_unit_price: overridePrice
      });
    }
  }

  return items;
}

function detectIntent(cleanedText, items) {
  if (cleanedText.indexOf("whatsapp") !== -1 || cleanedText.indexOf("reminder") !== -1) {
    return "send_whatsapp_reminder";
  }
  if (
    cleanedText.indexOf("buying rate") !== -1 ||
    cleanedText.indexOf("wholesale") !== -1 ||
    cleanedText.indexOf("cost price") !== -1 ||
    cleanedText.indexOf("konna rate") !== -1
  ) {
    return "get_wholesale_rate";
  }
  if (
    cleanedText.indexOf("upi") !== -1 ||
    cleanedText.indexOf("phonepe") !== -1 ||
    cleanedText.indexOf("gpay") !== -1 ||
    cleanedText.indexOf("paytm") !== -1 ||
    cleanedText.indexOf("come from") !== -1 ||
    cleanedText.indexOf("bheje") !== -1 ||
    cleanedText.indexOf("vachaya") !== -1 ||
    cleanedText.indexOf("payment") !== -1
  ) {
    return "verify_upi_payment";
  }
  if (
    cleanedText.indexOf("stock") !== -1 ||
    cleanedText.indexOf("expir") !== -1 ||
    cleanedText.indexOf("bacha") !== -1 ||
    cleanedText.indexOf("takkuva") !== -1 ||
    cleanedText.indexOf("inventory") !== -1
  ) {
    return "check_inventory";
  }
  if (
    cleanedText.indexOf("khata") !== -1 ||
    cleanedText.indexOf("khate") !== -1 ||
    cleanedText.indexOf("credit") !== -1 ||
    cleanedText.indexOf("udhaar") !== -1
  ) {
    return "log_khata";
  }
  if (items.length > 0 || cleanedText.indexOf("bill") !== -1 || cleanedText.indexOf("total") !== -1) {
    return "calculate_quick_bill";
  }
  return "unknown";
}

function processVoiceCommand(rawTranscript) {
  const startTime = Date.now();
  const cleaned = cleanTranscript(rawTranscript);
  const items = extractItems(cleaned);
  const customer = findCustomer(cleaned);
  const intent = detectIntent(cleaned, items);

  let status = "valid";
  let entities = {};
  let spoken = "";
  let errorCode = null;

  if (intent === "log_khata") {
    entities = {
      customer_name: customer,
      items: items,
      client_tx_id: "tx_" + Date.now() + "_" + (++txCounter)
    };

    if (!customer) {
      status = "needs_clarification";
      errorCode = "MISSING_CUSTOMER";
      spoken = "Which customer's khata should I add this to?";
    } else if (items.length === 0) {
      status = "needs_clarification";
      errorCode = "UNKNOWN_PRODUCT";
      spoken = "I could not find that product in the store catalog. Please repeat the item name.";
    } else {
      spoken = "Ready to add " + items.length + " item(s) to " + customer + "'s khata.";
    }
  } else if (intent === "calculate_quick_bill") {
    entities = { items: items };

    if (items.length === 0) {
      status = "needs_clarification";
      errorCode = "NO_ITEMS_FOUND";
      spoken = "Please say the item names and quantities for the bill.";
    } else {
      spoken = "Calculated quick bill with " + items.length + " item(s).";
    }
  } else if (intent === "verify_upi_payment") {
    const amountMatch = cleaned.match(/\b(\d+(?:\.\d+)?)\b/);
    const amount = amountMatch ? parseFloat(amountMatch[1]) : null;
    let app = null;
    if (cleaned.indexOf("phonepe") !== -1) app = "PhonePe";
    else if (cleaned.indexOf("gpay") !== -1) app = "GPay";
    else if (cleaned.indexOf("paytm") !== -1) app = "Paytm";

    entities = { sender: customer, amount: amount, app: app };

    if (!customer || !amount || amount <= 0) {
      status = "needs_clarification";
      errorCode = "MISSING_AMOUNT_OR_SENDER";
      spoken = "Please tell me the sender name and rupee amount to verify.";
    } else {
      spoken = "Checking UPI feed for " + amount + " rupees from " + customer + ".";
    }
  } else if (intent === "check_inventory") {
    const checks = [];
    if (cleaned.indexOf("stock") !== -1 || cleaned.indexOf("takkuva") !== -1 || cleaned.indexOf("bacha") !== -1) {
      checks.push("low_stock");
    }
    if (cleaned.indexOf("expir") !== -1) {
      checks.push("expiring_soon");
    }
    if (checks.length === 0) {
      checks.push("low_stock", "expiring_soon");
    }

    entities = {
      checks: checks,
      product_name: items.length > 0 ? items[0].product_name : null
    };
    spoken = "Checking " + checks.join(" and ").replace(/_/g, " ") + " status.";
  } else if (intent === "get_wholesale_rate") {
    const target = items.length > 0 ? items[0].product_name : null;
    entities = { product_name: target, discreet: true };

    if (!target) {
      status = "needs_clarification";
      errorCode = "UNKNOWN_PRODUCT";
      spoken = "Which product's wholesale buying rate do you need?";
    } else {
      spoken = "Fetching discreet wholesale rate for " + target + ".";
    }
  } else if (intent === "send_whatsapp_reminder") {
    entities = { customer_name: customer, auto_send: false };

    if (!customer) {
      status = "needs_clarification";
      errorCode = "MISSING_CUSTOMER";
      spoken = "Which customer should I draft the WhatsApp reminder for?";
    } else {
      spoken = "Drafted a polite WhatsApp khata reminder for " + customer + ".";
    }
  } else {
    status = "needs_clarification";
    errorCode = "UNCLEAR_REQUEST";
    spoken = "Sorry, I did not catch that. Please repeat the billing, khata, stock, or payment request.";
  }

  return {
    raw_transcript: rawTranscript,
    cleaned_transcript: cleaned,
    parsed_intent: intent,
    status: status,
    entities: entities,
    latency_ms: Date.now() - startTime,
    spoken_response: spoken,
    fallback_text: spoken,
    error_code: errorCode
  };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { processVoiceCommand, cleanTranscript };
}
