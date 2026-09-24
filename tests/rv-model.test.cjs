const test = require('node:test');
const assert = require('node:assert/strict');
const model = require('../src/rv-model.js');

test('fiducial photon bound is finite and positive', () => {
  const result = model.photonBound();
  assert.ok(Number.isFinite(result.photonSigmaMs));
  assert.ok(result.photonSigmaMs > 0);
  assert.ok(result.qualityFactor > 0);
});

test('doubling the fixed photon budget improves the bound by sqrt two', () => {
  const base = model.photonBound({ totalContinuumElectrons: 1e9 }).photonSigmaMs;
  const doubled = model.photonBound({ totalContinuumElectrons: 2e9 }).photonSigmaMs;
  assert.ok(Math.abs(base / doubled - Math.sqrt(2)) < 1e-10);
});

test('doubling separated line count improves precision by sqrt two', () => {
  const twenty = model.photonBound({ lineCount: 20 }).photonSigmaMs;
  const forty = model.photonBound({ lineCount: 40 }).photonSigmaMs;
  assert.ok(Math.abs(twenty / forty - Math.sqrt(2)) < 0.01);
});

test('instrumental convolution conserves single-line equivalent-width proxy', () => {
  const low = model.broadenedLine({ resolution: 40000 });
  const high = model.broadenedLine({ resolution: 250000 });
  assert.ok(Math.abs(low.observedDepth * low.observedSigmaMs - high.observedDepth * high.observedSigmaMs) < 1e-9);
});

test('higher resolution improves the photon bound but with diminishing returns for broad lines', () => {
  const at100 = model.photonBound({ resolution: 100000, intrinsicFwhmKmS: 10 }).photonSigmaMs;
  const at150 = model.photonBound({ resolution: 150000, intrinsicFwhmKmS: 10 }).photonSigmaMs;
  const at250 = model.photonBound({ resolution: 250000, intrinsicFwhmKmS: 10 }).photonSigmaMs;
  assert.ok(at150 < at100);
  assert.ok(at250 < at150);
  assert.ok((at100 - at150) > (at150 - at250));
});

test('legacy proxy is calibrated exactly at the declared fiducial scenario', () => {
  const exact = model.photonBound().photonSigmaMs;
  const proxy = model.legacyProxySigma();
  assert.ok(Math.abs(exact - proxy) < 1e-12);
});

test('reported quality factor reproduces the direct Fisher bound', () => {
  const result = model.photonBound();
  const fromQualityFactor = model.C_MS / (result.qualityFactor * Math.sqrt(result.detectedElectrons));
  assert.ok(Math.abs(fromQualityFactor - result.photonSigmaMs) < 1e-12);
});

test('legacy worker audit exposes the kilometre-per-second unit mismatch', () => {
  const audit = model.legacyWorkerDefault();
  assert.equal(audit.dimensionallyConsistentValueMs / audit.numericalValueLabelledMs, 1000);
});

test('invalid physical parameters fail explicitly', () => {
  assert.throws(() => model.photonBound({ lineDepth: 1 }), /below one/);
  assert.throws(() => model.photonBound({ resolution: 0 }), /greater than zero/);
  assert.throws(() => model.photonBound({ floorMs: -1 }), /non-negative/);
});
