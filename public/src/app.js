import { CURRENCIES, calculateExpectedPrice, calculateGoldValue, calculateVendor, convertCurrency, parseSmartInput, purityFromInput } from "./calculations.js";
import { fetchMarketData, marketDataFromManualRate, readCachedMarketData } from "./api.js";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const FALLBACK_RATES = { USD: 1, SGD: 1.29, INR: 88 };

const state = {
  weight: 10,
  purity: 22 / 24,
  purityLabel: "22K",
  spotKarat: 24,
  primaryCurrency: "SGD",
  market: readCachedMarketData(),
};

function money(amount, currency, narrow = false) {
  const symbols = { SGD: "S$", INR: "₹", USD: "US$" };
  const digits = currency === "INR" && narrow ? 0 : 2;
  return `${symbols[currency]}${new Intl.NumberFormat("en-SG", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(Number(amount) || 0)}`;
}

function number(value, digits = 3) {
  return new Intl.NumberFormat("en-SG", { maximumFractionDigits: digits }).format(Number(value) || 0);
}

function currentRates() { return state.market?.rates || FALLBACK_RATES; }
function spot(currency) { return convertCurrency(state.market?.spotUsdPerGram || 0, "USD", currency, currentRates()); }

function renderMarketStatus() {
  const market = state.market;
  const live = market?.source === "live";
  const cached = market?.source === "cached";
  $("#rateStatus").textContent = live ? "Live market rate" : cached ? "Cached market rate" : market ? "Manual rate" : "Live price unavailable";
  $(".pulse").classList.toggle("offline", !live);
  $("#rateSource").textContent = live ? `Gold API · FX ${market.fxDate || "latest"}` : cached ? "Cached — tap refresh for live price" : market ? "Manual 24K rate in use" : "Enter a manual rate below";
  $("#manualRateForm").classList.toggle("hidden", Boolean(market));
  const displayedPurity = purityFromInput(state.spotKarat, "karat");
  $$(".spot-purity-label").forEach((label) => { label.textContent = `${state.spotKarat}K / gram`; });
  CURRENCIES.forEach((currency) => {
    $(`#spot${currency[0]}${currency.slice(1).toLowerCase()}`).textContent = market ? money(spot(currency) * displayedPurity, currency, true) : "—";
  });
  $("#lastUpdated").textContent = market ? `Last updated: ${new Date(market.timestamp).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}` : "Last updated: —";
}

function render() {
  renderMarketStatus();
  const result = calculateGoldValue({ weight: state.weight, purity: state.purity, spotPerGram: state.market?.spotUsdPerGram || 0 });
  const primaryValue = convertCurrency(result.value, "USD", state.primaryCurrency, currentRates());
  $("#resultDescriptor").textContent = `${number(state.weight)} g · ${state.purityLabel}`;
  $("#primaryValue").textContent = state.market ? money(primaryValue, state.primaryCurrency, true) : "—";
  $("#sgdEquivalent").textContent = state.market ? money(convertCurrency(result.value, "USD", "SGD", currentRates()), "SGD", true) : "S$ —";
  $("#inrEquivalent").textContent = state.market ? money(convertCurrency(result.value, "USD", "INR", currentRates()), "INR", true) : "₹ —";
  $("#pureWeight").textContent = `${number(result.pureWeight)} g`;
  $("#karatPrice").textContent = state.market ? money(spot(state.primaryCurrency) * state.purity, state.primaryCurrency) : "—";
  $("#primarySpot").textContent = state.market ? money(spot(state.primaryCurrency), state.primaryCurrency) : "—";
  renderVendor(result.value);
  renderReceipt(primaryValue);
}

function renderVendor(intrinsicUsd) {
  const vendorPrice = Number($("#vendorPrice").value);
  const currency = $("#vendorCurrency").value;
  const intrinsic = convertCurrency(intrinsicUsd, "USD", currency, currentRates());
  const metrics = calculateVendor({ vendorPrice, intrinsicValue: intrinsic, weight: state.weight });
  $("#vendorGoldValue").textContent = state.market ? money(intrinsic, currency) : "—";
  $("#vendorQuoted").textContent = vendorPrice ? money(vendorPrice, currency) : "—";
  $("#vendorExtra").textContent = vendorPrice && state.market ? money(metrics.extra, currency) : "—";
  $("#vendorPremium").textContent = vendorPrice && state.market ? `${number(metrics.premium, 1)}%` : "—";
  $("#vendorPerGram").textContent = vendorPrice ? `${money(metrics.pricePerGram, currency)} / g` : "—";
}

function renderReceipt(goldValue) {
  const expected = calculateExpectedPrice({ goldValue, makingCharge: $("#makingCharge").value, makingType: $("#makingType").value, taxRate: $("#taxRate").value });
  const currency = state.primaryCurrency;
  $("#receiptGold").textContent = state.market ? money(goldValue, currency) : "—";
  $("#receiptMaking").textContent = money(expected.charge, currency);
  $("#receiptTax").textContent = money(expected.tax, currency);
  $("#receiptTotal").textContent = state.market ? money(expected.total, currency) : "—";
}

function selectKarat(value) {
  $$("[data-karat]").forEach((button) => button.classList.toggle("active", button.dataset.karat === String(value)));
  const custom = value === "custom";
  $("#customPurityWrap").classList.toggle("hidden", !custom);
  if (!custom) { state.purity = purityFromInput(value, "karat"); state.purityLabel = `${value}K`; render(); }
  else $("#customPurity").focus();
}

function applySmartInput() {
  const parsed = parseSmartInput($("#smartInput").value);
  if (parsed.weight) { $("#weight").value = parsed.weight; state.weight = parsed.weight; }
  if (parsed.purityInput) {
    if (parsed.purityMode === "karat" && [24, 23, 22, 21, 20, 18, 14, 10, 9].includes(parsed.purityInput)) selectKarat(parsed.purityInput);
    else { selectKarat("custom"); $("#customPurity").value = parsed.purityInput; state.purity = purityFromInput(parsed.purityInput, parsed.purityMode); state.purityLabel = parsed.purityMode === "karat" ? `${parsed.purityInput}K` : `${number(state.purity * 100, 1)}%`; }
  }
  if (parsed.vendorPrice) $("#vendorPrice").value = parsed.vendorPrice;
  if (parsed.currency) $("#vendorCurrency").value = parsed.currency;
  render();
}

async function refreshMarket() {
  const button = $("#refreshRates"); button.disabled = true; button.classList.add("loading");
  try { state.market = await fetchMarketData(); }
  catch {
    const cached = readCachedMarketData();
    state.market = cached ? { ...cached, source: "cached" } : null;
    $("#manualRateForm").classList.remove("hidden");
  } finally { button.disabled = false; button.classList.remove("loading"); render(); }
}

function bindEvents() {
  $("#weight").addEventListener("input", (event) => { state.weight = Math.max(Number(event.target.value) || 0, 0); $$("[data-weight]").forEach((b) => b.classList.toggle("active", Number(b.dataset.weight) === state.weight)); render(); });
  $$("[data-weight]").forEach((button) => button.addEventListener("click", () => { $("#weight").value = button.dataset.weight; state.weight = Number(button.dataset.weight); $$("[data-weight]").forEach((b) => b.classList.toggle("active", b === button)); render(); }));
  $$("[data-karat]").forEach((button) => button.addEventListener("click", () => selectKarat(button.dataset.karat)));
  $("#customPurity").addEventListener("input", (event) => { state.purity = purityFromInput(event.target.value); const raw = Number(event.target.value); state.purityLabel = raw > 100 ? `${number(state.purity * 100, 1)}% fine` : raw > 24 ? `${number(state.purity * 100, 1)}%` : `${number(raw, 2)}K`; $("#purityHint").textContent = state.purity ? `${number(state.purity * 100, 2)}% pure · approx. ${number(state.purity * 24, 2)}K` : "Enter 916 for 91.6% fineness."; render(); });
  $$("[data-currency]").forEach((button) => button.addEventListener("click", () => { state.primaryCurrency = button.dataset.currency; $$("[data-currency]").forEach((b) => b.classList.toggle("active", b === button)); render(); }));
  ["vendorPrice", "vendorCurrency", "makingCharge", "makingType", "taxRate"].forEach((id) => $(`#${id}`).addEventListener("input", render));
  $("#applySmart").addEventListener("click", applySmartInput); $("#smartInput").addEventListener("keydown", (event) => { if (event.key === "Enter") applySmartInput(); });
  $("#refreshRates").addEventListener("click", refreshMarket);
  $("#spotKarat").addEventListener("change", (event) => { state.spotKarat = Number(event.target.value); renderMarketStatus(); });
  $("#manualRateForm").addEventListener("submit", (event) => { event.preventDefault(); try { state.market = marketDataFromManualRate($("#manualRate").value, $("#manualCurrency").value, currentRates()); render(); } catch { $("#manualRate").setCustomValidity("Enter a valid positive price"); $("#manualRate").reportValidity(); } });
  $("#themeToggle").addEventListener("click", () => { const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark"; document.documentElement.dataset.theme = next; localStorage.setItem("aurum-theme", next); });
}

document.documentElement.dataset.theme = localStorage.getItem("aurum-theme") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
bindEvents(); render(); refreshMarket();
