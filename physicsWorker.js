importScripts('src/rv-model.js?v=2.0.0');

const RESOLUTIONS = Array.from({ length: 43 }, (_, index) => 40000 + index * 5000);
const HEATMAP_RESOLUTIONS = [40000, 60000, 80000, 100000, 120000, 150000, 200000, 250000];
const HEATMAP_WIDTHS = [1, 2.5, 5, 10];

function compute(parameters) {
  const exact = [];
  const proxy = [];
  for (const resolution of RESOLUTIONS) {
    const scenario = { ...parameters, resolution };
    exact.push(RVModel.photonBound(scenario).photonSigmaMs);
    proxy.push(RVModel.legacyProxySigma(scenario));
  }

  const current = RVModel.photonBound(parameters);
  const currentProxy = RVModel.legacyProxySigma(parameters);
  const at250k = RVModel.photonBound({ ...parameters, resolution: 250000 }).photonSigmaMs;
  const cells = [];
  for (const intrinsicFwhmKmS of HEATMAP_WIDTHS) {
    for (const resolution of HEATMAP_RESOLUTIONS) {
      const scenario = { ...parameters, intrinsicFwhmKmS, resolution };
      const bound = RVModel.photonBound(scenario).photonSigmaMs;
      const estimate = RVModel.legacyProxySigma(scenario);
      cells.push({ intrinsicFwhmKmS, resolution, optimismFactor: bound / estimate });
    }
  }

  return {
    series: [
      { name: 'Discrete Fisher bound', x: RESOLUTIONS, y: exact },
      { name: 'Legacy linear-R proxy', x: RESOLUTIONS, y: proxy }
    ],
    current: {
      ...current,
      legacyProxySigmaMs: currentProxy,
      legacyOptimismFactor: current.photonSigmaMs / currentProxy,
      gainTo250kPercent: 100 * (1 - at250k / current.photonSigmaMs)
    },
    heatmap: { resolutions: HEATMAP_RESOLUTIONS, widths: HEATMAP_WIDTHS, cells }
  };
}

onmessage = event => {
  try {
    postMessage({ ok: true, runId: event.data.runId, payload: compute(event.data.parameters) });
  } catch (error) {
    postMessage({ ok: false, runId: event.data.runId, error: error.message });
  }
};
