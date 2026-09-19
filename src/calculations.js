export const TROY_OUNCE_GRAMS = 31.1034768;
export const CURRENCIES = ["SGD", "INR", "USD"];

export function purityFromInput(value, mode = "auto") {
  const number = Number.parseFloat(String(value).replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(number) || number <= 0) return 0;
  if (mode === "karat" || (mode === "auto" && number <= 24)) return Math.min(number / 24, 1);
  if (mode === "percent" || (mode === "auto" && number <= 100)) return Math.min(number / 100, 1);
  return Math.min(number / 1000, 1);
}

export function calculateGoldValue({ weight, purity, spotPerGram }) {
  const safeWeight = Math.max(Number(weight) || 0, 0);
  const safePurity = Math.min(Math.max(Number(purity) || 0, 0), 1);
  const safeSpot = Math.max(Number(spotPerGram) || 0, 0);
  const pureWeight = safeWeight * safePurity;
  return { pureWeight, karatPrice: safeSpot * safePurity, value: pureWeight * safeSpot };
}

export function convertCurrency(amount, from, to, usdRates) {
  if (!Number.isFinite(Number(amount))) return 0;
  if (from === to) return Number(amount);
  const fromRate = from === "USD" ? 1 : usdRates[from];
  const toRate = to === "USD" ? 1 : usdRates[to];
  if (!fromRate || !toRate) return 0;
  return (Number(amount) / fromRate) * toRate;
}

export function calculateVendor({ vendorPrice, intrinsicValue, weight }) {
  const price = Math.max(Number(vendorPrice) || 0, 0);
  const intrinsic = Math.max(Number(intrinsicValue) || 0, 0);
  const extra = price - intrinsic;
  return {
    extra,
    premium: intrinsic > 0 ? (extra / intrinsic) * 100 : 0,
    pricePerGram: Number(weight) > 0 ? price / Number(weight) : 0,
  };
}

export function calculateExpectedPrice({ goldValue, makingCharge, makingType, taxRate }) {
  const gold = Math.max(Number(goldValue) || 0, 0);
  const chargeInput = Math.max(Number(makingCharge) || 0, 0);
  const charge = makingType === "percent" ? gold * chargeInput / 100 : chargeInput;
  const subtotal = gold + charge;
  const tax = subtotal * Math.max(Number(taxRate) || 0, 0) / 100;
  return { charge, tax, total: subtotal + tax };
}

export function parseSmartInput(input) {
  const text = String(input).trim().toLowerCase();
  const weightMatch = text.match(/(\d+(?:\.\d+)?)\s*g\b/);
  const karatMatch = text.match(/(\d+(?:\.\d+)?)\s*k\b/);
  const finenessMatch = !karatMatch ? text.match(/\b(\d{3})(?:\s*(?:fine|fineness))?\b/) : null;
  const vendorMatch = text.match(/(?:vendor|price|quoted?)\s*[:=]?\s*(\d+(?:[,.]\d+)?)/);
  const currencyMatch = text.match(/\b(sgd|inr|usd)\b/);
  return {
    weight: weightMatch ? Number(weightMatch[1]) : null,
    purityInput: karatMatch ? Number(karatMatch[1]) : finenessMatch ? Number(finenessMatch[1]) : null,
    purityMode: karatMatch ? "karat" : finenessMatch ? "fineness" : null,
    vendorPrice: vendorMatch ? Number(vendorMatch[1].replace(",", "")) : null,
    currency: currencyMatch ? currencyMatch[1].toUpperCase() : null,
  };
}

export function normalizeOffer({ weight, purity, vendorPrice, currency }, spotUsd, usdRates, targetCurrency) {
  const intrinsicUsd = calculateGoldValue({ weight, purity, spotPerGram: spotUsd }).value;
  const vendorTarget = convertCurrency(vendorPrice, currency, targetCurrency, usdRates);
  const intrinsicTarget = convertCurrency(intrinsicUsd, "USD", targetCurrency, usdRates);
  const metrics = calculateVendor({ vendorPrice: vendorTarget, intrinsicValue: intrinsicTarget, weight });
  return { intrinsic: intrinsicTarget, vendor: vendorTarget, ...metrics };
}
