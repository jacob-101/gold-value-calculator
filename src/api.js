import { TROY_OUNCE_GRAMS } from "./calculations.js";

const GOLD_URL = "https://api.gold-api.com/price/XAU";
const FX_URL = "https://api.frankfurter.dev/v1/latest?base=USD&symbols=SGD,INR";
const CACHE_KEY = "aurum-market-data-v1";

function validPositive(value, max = Infinity) {
  return Number.isFinite(Number(value)) && Number(value) > 0 && Number(value) < max;
}

export function validateMarketData(data) {
  return validPositive(data?.spotUsdPerGram, 10000) && validPositive(data?.rates?.SGD, 100) && validPositive(data?.rates?.INR, 1000);
}

export function readCachedMarketData() {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY));
    return validateMarketData(cached) ? cached : null;
  } catch { return null; }
}

export function cacheMarketData(data) {
  if (validateMarketData(data)) localStorage.setItem(CACHE_KEY, JSON.stringify(data));
}

export async function fetchMarketData() {
  const [goldResponse, fxResponse] = await Promise.all([fetch(GOLD_URL), fetch(FX_URL)]);
  if (!goldResponse.ok || !fxResponse.ok) throw new Error("Market data request failed");
  const [gold, fx] = await Promise.all([goldResponse.json(), fxResponse.json()]);
  const ouncePrice = Number(gold.price ?? gold.ask ?? gold.value);
  const data = {
    spotUsdPerGram: ouncePrice / TROY_OUNCE_GRAMS,
    rates: { USD: 1, SGD: Number(fx.rates?.SGD), INR: Number(fx.rates?.INR) },
    timestamp: gold.updatedAt ?? gold.updated_at ?? gold.timestamp ?? new Date().toISOString(),
    fxDate: fx.date,
    source: "live",
  };
  if (!validPositive(ouncePrice, 100000) || !validateMarketData(data)) throw new Error("Invalid market data");
  cacheMarketData(data);
  return data;
}

export function marketDataFromManualRate(rate, currency, rates, timestamp = new Date().toISOString()) {
  const value = Number(rate);
  const usdRate = currency === "USD" ? 1 : rates[currency];
  if (!validPositive(value, 10000000) || !validPositive(usdRate)) throw new Error("Invalid manual rate");
  return { spotUsdPerGram: value / usdRate, rates, timestamp, source: "manual" };
}
