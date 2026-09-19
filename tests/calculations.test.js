import test from "node:test";
import assert from "node:assert/strict";
import { calculateExpectedPrice, calculateGoldValue, convertCurrency, purityFromInput } from "../public/src/calculations.js";

test("karat and fineness convert to precise purity", () => {
  assert.equal(purityFromInput(22, "karat"), 22 / 24);
  assert.equal(purityFromInput(916), 0.916);
  assert.equal(purityFromInput(75), 0.75);
});

test("intrinsic value uses pure gold weight", () => {
  const result = calculateGoldValue({ weight: 12.5, purity: 0.75, spotPerGram: 152 });
  assert.equal(result.pureWeight, 9.375);
  assert.equal(result.value, 1425);
});

test("currency conversion uses USD cross rates", () => {
  assert.equal(convertCurrency(100, "SGD", "INR", { USD: 1, SGD: 1.25, INR: 87.5 }), 7000);
});

test("making charge and tax remain explicit", () => {
  assert.deepEqual(calculateExpectedPrice({ goldValue: 1000, makingCharge: 10, makingType: "percent", taxRate: 9 }), { charge: 100, tax: 99, total: 1199 });
});
