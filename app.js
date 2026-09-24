const DEFAULTS = Object.freeze({
  resolution: 100000,
  intrinsicFwhmKmS: 2.5,
  lineDepth: 0.45,
  lineCount: 40,
  logElectrons: 9,
  floorMs: 0
});

const ids = Object.keys(DEFAULTS);
const state = { worker: null, timer: null, run: 0 };
const element = id => document.getElementById(id);
const number = (value, digits = 3) => Number(value).toLocaleString('en-GB', { maximumFractionDigits: digits });
const scientific = value => Number(value).toExponential(2).replace('e+', 'e');

function parameters() {
  return {
    resolution: Number(element('resolution').value),
    intrinsicFwhmKmS: Number(element('intrinsicFwhmKmS').value),
    lineDepth: Number(element('lineDepth').value),
    lineCount: Number(element('lineCount').value),
    totalContinuumElectrons: 10 ** Number(element('logElectrons').value),
    velocitySpanMs: 3e6,
    pixelsPerResolutionElement: 4,
    floorMs: Number(element('floorMs').value)
  };
}

function updateOutputs() {
  element('out-resolution').textContent = Number(element('resolution').value).toLocaleString('en-GB');
  element('out-intrinsicFwhmKmS').textContent = `${Number(element('intrinsicFwhmKmS').value).toFixed(1)} km/s`;
  element('out-lineDepth').textContent = Number(element('lineDepth').value).toFixed(2);
  element('out-lineCount').textContent = element('lineCount').value;
  element('out-logElectrons').textContent = `10${superscript(Number(element('logElectrons').value))} e⁻`;
  element('out-floorMs').textContent = `${Number(element('floorMs').value).toFixed(2)} m/s`;
}

function superscript(value) {
  const glyphs = { '-': '⁻', '.': '·', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
  return String(value).split('').map(character => glyphs[character] ?? character).join('');
}

function requestModel() {
  clearTimeout(state.timer);
  state.timer = setTimeout(() => {
    state.run += 1;
    element('workerStatus').textContent = `Computing run ${state.run}`;
    state.worker.postMessage({ runId: state.run, parameters: parameters() });
  }, 100);
}

function renderChart(series, currentResolution) {
  const width = 900;
  const height = 430;
  const margin = { left: 78, right: 32, top: 42, bottom: 62 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const allY = series.flatMap(item => item.y);
  const yMin = Math.min(...allY) * 0.75;
  const yMax = Math.max(...allY) * 1.35;
  const logMin = Math.log10(yMin);
  const logMax = Math.log10(yMax);
  const sx = value => margin.left + (value - 40000) / 210000 * plotWidth;
  const sy = value => margin.top + (logMax - Math.log10(value)) / (logMax - logMin) * plotHeight;
  const colours = ['#67ddd0', '#f3ad55'];
  const xTicks = [40000, 80000, 120000, 160000, 200000, 250000];
  const yTicks = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50].filter(value => value >= yMin && value <= yMax);
  const parts = [
    `<svg viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="chart-title chart-desc">`,
    '<title id="chart-title">Photon-information uncertainty and legacy proxy by resolving power</title>',
    '<desc id="chart-desc">A logarithmic uncertainty chart. The exact Fisher bound is teal and the calibrated legacy linear-resolution proxy is amber.</desc>'
  ];
  for (const tick of yTicks) {
    const y = sy(tick);
    parts.push(`<line x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}" stroke="#35506b" stroke-width="1"/>`);
    parts.push(`<text x="${margin.left - 12}" y="${y + 4}" text-anchor="end" fill="#aebfcd" font-family="ui-monospace,monospace" font-size="12">${tick}</text>`);
  }
  for (const tick of xTicks) {
    const x = sx(tick);
    parts.push(`<line x1="${x}" y1="${margin.top}" x2="${x}" y2="${height - margin.bottom}" stroke="#2a4560" stroke-width="1"/>`);
    parts.push(`<text x="${x}" y="${height - margin.bottom + 25}" text-anchor="middle" fill="#aebfcd" font-family="ui-monospace,monospace" font-size="12">${tick / 1000}k</text>`);
  }
  const currentX = sx(currentResolution);
  parts.push(`<line x1="${currentX}" y1="${margin.top}" x2="${currentX}" y2="${height - margin.bottom}" stroke="#ffffff" stroke-width="1.5" stroke-dasharray="5 6" opacity=".75"/>`);
  parts.push(`<text x="${currentX}" y="${margin.top - 12}" text-anchor="middle" fill="#ffffff" font-family="ui-monospace,monospace" font-size="11">current R</text>`);
  series.forEach((item, index) => {
    const path = item.x.map((x, point) => `${point ? 'L' : 'M'}${sx(x).toFixed(2)} ${sy(item.y[point]).toFixed(2)}`).join(' ');
    parts.push(`<path d="${path}" fill="none" stroke="${colours[index]}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`);
  });
  parts.push(`<line x1="${margin.left}" y1="${height - margin.bottom}" x2="${width - margin.right}" y2="${height - margin.bottom}" stroke="#6d8194"/>`);
  parts.push(`<line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${height - margin.bottom}" stroke="#6d8194"/>`);
  parts.push(`<text x="${margin.left}" y="20" fill="${colours[0]}" font-family="Inter,Arial,sans-serif" font-size="13" font-weight="700">— Exact Fisher bound</text>`);
  parts.push(`<text x="${margin.left + 190}" y="20" fill="${colours[1]}" font-family="Inter,Arial,sans-serif" font-size="13" font-weight="700">— Legacy proxy</text>`);
  parts.push(`<text x="${width / 2}" y="${height - 15}" text-anchor="middle" fill="#d6e2eb" font-family="Inter,Arial,sans-serif" font-size="13" font-weight="700">Resolving power R</text>`);
  parts.push(`<text transform="translate(20 ${height / 2}) rotate(-90)" text-anchor="middle" fill="#d6e2eb" font-family="Inter,Arial,sans-serif" font-size="13" font-weight="700">Photon uncertainty [m/s] · log scale</text>`);
  parts.push('</svg>');
  element('curveChart').innerHTML = parts.join('');
}

function renderMetrics(current) {
  const metrics = [
    ['Photon lower bound', `${number(current.photonSigmaMs, 4)} m/s`],
    ['With optional floor', `${number(current.totalSigmaMs, 4)} m/s`],
    ['Bouchy Q', number(current.qualityFactor, 0)],
    ['Observed line depth', number(current.observedDepth, 4)],
    ['Exact ÷ proxy', `${number(current.legacyOptimismFactor, 3)}×`],
    ['Gain to R=250k', `${number(current.gainTo250kPercent, 2)}%`]
  ];
  element('metrics').innerHTML = metrics.map(([label, value]) => `<div class="metric"><span>${label}</span><strong>${value}</strong></div>`).join('');
}

function cellColour(value) {
  if (value >= 2) return '#a85f00';
  if (value >= 1.25) return '#167f76';
  if (value >= 0.8) return '#2c6976';
  return '#3d5d7a';
}

function renderHeatmap(heatmap) {
  const byKey = new Map(heatmap.cells.map(cell => [`${cell.intrinsicFwhmKmS}:${cell.resolution}`, cell.optimismFactor]));
  const header = heatmap.resolutions.map(value => `<th scope="col">${value / 1000}k</th>`).join('');
  const rows = heatmap.widths.map(width => {
    const cells = heatmap.resolutions.map(resolution => {
      const value = byKey.get(`${width}:${resolution}`);
      const label = `${number(value, 2)} times at intrinsic FWHM ${width} kilometres per second and resolving power ${resolution}`;
      return `<td style="background:${cellColour(value)}" aria-label="${label}">${number(value, 2)}×</td>`;
    }).join('');
    return `<tr><th scope="row">${width} km/s</th>${cells}</tr>`;
  }).join('');
  element('heatmap').innerHTML = `<table class="heatmap"><caption class="visually-hidden">Exact uncertainty divided by legacy proxy uncertainty</caption><thead><tr><th scope="col">Intrinsic FWHM</th>${header}</tr></thead><tbody>${rows}</tbody></table>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
}

async function loadPublishedEvidence() {
  try {
    const [summaryResponse, sourceResponse] = await Promise.all([
      fetch('research/results/summary.json', { cache: 'no-cache' }),
      fetch('data/reference.json', { cache: 'no-cache' })
    ]);
    if (!summaryResponse.ok || !sourceResponse.ok) throw new Error('evidence request failed');
    const summary = await summaryResponse.json();
    const ledger = await sourceResponse.json();
    element('materialCount').textContent = summary.primary_result.materially_optimistic_scenarios;
    element('maximumFactor').textContent = `${number(summary.primary_result.maximum_optimism_factor, 3)}×`;
    element('sourceCards').innerHTML = ledger.sources.map(source => `
      <article class="source-card">
        <span>${escapeHtml(source.id)}</span>
        <h3>${escapeHtml(source.citation)}</h3>
        <p>${escapeHtml(source.claim_boundary)}</p>
        <a href="${escapeHtml(source.url)}">Open primary source →</a>
      </article>
    `).join('');
  } catch (error) {
    element('sourceCards').innerHTML = '<p>Primary-source ledger could not be loaded. It remains available as <a href="data/reference.json">JSON</a>.</p>';
  }
}

function initialise() {
  state.worker = new Worker('physicsWorker.js?v=2.0.0');
  state.worker.onmessage = event => {
    if (event.data.runId !== state.run) return;
    if (!event.data.ok) {
      element('workerStatus').textContent = `Model error: ${event.data.error}`;
      return;
    }
    const result = event.data.payload;
    renderChart(result.series, parameters().resolution);
    renderMetrics(result.current);
    renderHeatmap(result.heatmap);
    element('workerStatus').textContent = `Run ${state.run} complete`;
  };
  state.worker.onerror = event => {
    element('workerStatus').textContent = `Worker error: ${event.message}`;
  };

  for (const id of ids) {
    element(id).addEventListener('input', () => {
      updateOutputs();
      requestModel();
    });
  }
  element('reset').addEventListener('click', () => {
    for (const [id, value] of Object.entries(DEFAULTS)) element(id).value = value;
    updateOutputs();
    requestModel();
  });
  updateOutputs();
  requestModel();
  loadPublishedEvidence();
}

initialise();
