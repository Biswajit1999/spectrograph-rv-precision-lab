(function attachRvModel(root) {
  'use strict';

  const C_MS = 299792458;
  const C_KMS = C_MS / 1000;
  const FWHM_TO_SIGMA = 1 / (2 * Math.sqrt(2 * Math.log(2)));
  const DEFAULTS = Object.freeze({
    resolution: 100000,
    intrinsicFwhmKmS: 2.5,
    lineDepth: 0.45,
    lineCount: 40,
    totalContinuumElectrons: 1e9,
    velocitySpanMs: 3e6,
    pixelsPerResolutionElement: 4,
    floorMs: 0
  });

  function finitePositive(value, name) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new RangeError(`${name} must be finite and greater than zero`);
    }
    return value;
  }

  function normalizeParameters(input = {}) {
    const parameters = { ...DEFAULTS, ...input };
    finitePositive(parameters.resolution, 'resolution');
    finitePositive(parameters.intrinsicFwhmKmS, 'intrinsicFwhmKmS');
    finitePositive(parameters.lineDepth, 'lineDepth');
    finitePositive(parameters.lineCount, 'lineCount');
    finitePositive(parameters.totalContinuumElectrons, 'totalContinuumElectrons');
    finitePositive(parameters.velocitySpanMs, 'velocitySpanMs');
    finitePositive(parameters.pixelsPerResolutionElement, 'pixelsPerResolutionElement');
    if (parameters.lineDepth >= 1) throw new RangeError('lineDepth must be below one');
    if (!Number.isInteger(parameters.lineCount)) throw new RangeError('lineCount must be an integer');
    if (!Number.isFinite(parameters.floorMs) || parameters.floorMs < 0) {
      throw new RangeError('floorMs must be finite and non-negative');
    }
    return parameters;
  }

  function broadenedLine(input = {}) {
    const parameters = normalizeParameters(input);
    const intrinsicSigmaMs = parameters.intrinsicFwhmKmS * 1000 * FWHM_TO_SIGMA;
    const instrumentalFwhmMs = C_MS / parameters.resolution;
    const instrumentalSigmaMs = instrumentalFwhmMs * FWHM_TO_SIGMA;
    const observedSigmaMs = Math.hypot(intrinsicSigmaMs, instrumentalSigmaMs);
    const observedDepth = parameters.lineDepth * intrinsicSigmaMs / observedSigmaMs;
    return {
      intrinsicSigmaMs,
      instrumentalFwhmMs,
      observedSigmaMs,
      observedFwhmKmS: observedSigmaMs / FWHM_TO_SIGMA / 1000,
      observedDepth
    };
  }

  function photonBound(input = {}) {
    const parameters = normalizeParameters(input);
    const line = broadenedLine(parameters);
    const nominalPixelWidthMs = C_MS / parameters.resolution / parameters.pixelsPerResolutionElement;
    const lineCellWidthMs = parameters.velocitySpanMs / parameters.lineCount;
    const pixelsPerLine = Math.max(12, Math.round(lineCellWidthMs / nominalPixelWidthMs));
    const pixelCount = pixelsPerLine * parameters.lineCount;
    const pixelWidthMs = parameters.velocitySpanMs / pixelCount;
    const continuumElectronsPerPixel = parameters.totalContinuumElectrons / pixelCount;
    const centerMs = lineCellWidthMs / 2;
    let fisherPerLinePerMsSquared = 0;
    let detectedElectronsPerLine = 0;

    for (let pixel = 0; pixel < pixelsPerLine; pixel += 1) {
      const velocityMs = (pixel + 0.5) * pixelWidthMs;
      const offsetMs = velocityMs - centerMs;
      const exponent = Math.exp(-0.5 * (offsetMs / line.observedSigmaMs) ** 2);
      const normalizedFlux = 1 - line.observedDepth * exponent;
      const derivativePerMs = line.observedDepth * exponent * offsetMs / line.observedSigmaMs ** 2;
      if (!(normalizedFlux > 0)) {
        throw new RangeError('line configuration produced non-positive flux');
      }
      const electrons = continuumElectronsPerPixel * normalizedFlux;
      const derivativeElectronsPerMs = continuumElectronsPerPixel * derivativePerMs;
      fisherPerLinePerMsSquared += derivativeElectronsPerMs ** 2 / electrons;
      detectedElectronsPerLine += electrons;
    }

    const fisherPerMsSquared = fisherPerLinePerMsSquared * parameters.lineCount;
    const detectedElectrons = detectedElectronsPerLine * parameters.lineCount;
    const photonSigmaMs = 1 / Math.sqrt(fisherPerMsSquared);
    const qualityFactor = C_MS * Math.sqrt(fisherPerMsSquared / detectedElectrons);
    const totalSigmaMs = Math.hypot(photonSigmaMs, parameters.floorMs);
    return {
      photonSigmaMs,
      totalSigmaMs,
      qualityFactor,
      detectedElectrons,
      fisherPerMsSquared,
      pixelCount,
      pixelWidthMs,
      ...line
    };
  }

  let cachedReferenceSigma;
  function referenceSigma() {
    if (cachedReferenceSigma === undefined) cachedReferenceSigma = photonBound(DEFAULTS).photonSigmaMs;
    return cachedReferenceSigma;
  }

  function legacyProxySigma(input = {}) {
    const parameters = normalizeParameters(input);
    return referenceSigma()
      * (DEFAULTS.resolution / parameters.resolution)
      * (DEFAULTS.lineDepth / parameters.lineDepth)
      * Math.sqrt(DEFAULTS.lineCount / parameters.lineCount)
      * Math.sqrt(DEFAULTS.totalContinuumElectrons / parameters.totalContinuumElectrons);
  }

  function legacyWorkerDefault() {
    const resolutionScale = 1.15;
    const lineDepth = 0.45;
    const lineDensity = 1;
    const snr = 100;
    const qSurrogate = 1800 * resolutionScale * lineDepth * Math.sqrt(lineDensity);
    return {
      qSurrogate,
      numericalValueLabelledMs: C_KMS / (qSurrogate * snr),
      dimensionallyConsistentValueMs: C_MS / (qSurrogate * snr)
    };
  }

  const api = Object.freeze({
    C_MS,
    DEFAULTS,
    photonBound,
    legacyProxySigma,
    legacyWorkerDefault,
    broadenedLine
  });

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.RVModel = api;
})(typeof self !== 'undefined' ? self : globalThis);
