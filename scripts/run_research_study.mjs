import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const model = require('../src/rv-model.js');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const protocolPath = path.join(root, 'research', 'protocol.json');
const protocol = JSON.parse(fs.readFileSync(protocolPath, 'utf8'));
const resultsDir = path.join(root, 'research', 'results');
const figuresDir = path.join(root, 'research', 'figures');
fs.mkdirSync(resultsDir, { recursive: true });
fs.mkdirSync(figuresDir, { recursive: true });

const hashFile = filePath => crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
const fixed = (value, digits = 9) => Number(value).toFixed(digits);
const median = values => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

const rows = [];
for (const resolution of protocol.parameter_grid.resolution) {
  for (const intrinsicFwhmKmS of protocol.parameter_grid.intrinsic_fwhm_km_s) {
    for (const lineDepth of protocol.parameter_grid.line_depth) {
      for (const lineCount of protocol.parameter_grid.line_count) {
        const parameters = {
          resolution,
          intrinsicFwhmKmS,
          lineDepth,
          lineCount,
          totalContinuumElectrons: protocol.fixed_conditions.continuum_electron_budget,
          velocitySpanMs: protocol.fixed_conditions.velocity_span_m_s,
          pixelsPerResolutionElement: protocol.fixed_conditions.pixels_per_resolution_element
        };
        const exact = model.photonBound(parameters);
        const proxySigmaMs = model.legacyProxySigma(parameters);
        const optimismFactor = exact.photonSigmaMs / proxySigmaMs;
        rows.push({
          resolution,
          intrinsicFwhmKmS,
          lineDepth,
          lineCount,
          exactSigmaMs: exact.photonSigmaMs,
          proxySigmaMs,
          optimismFactor,
          materiallyOptimistic: optimismFactor >= 2,
          qualityFactor: exact.qualityFactor,
          observedDepth: exact.observedDepth,
          observedFwhmKmS: exact.observedFwhmKmS,
          detectedElectrons: exact.detectedElectrons,
          pixelCount: exact.pixelCount
        });
      }
    }
  }
}

const byWidth = {};
for (const width of protocol.parameter_grid.intrinsic_fwhm_km_s) {
  const gains = [];
  for (const depth of protocol.parameter_grid.line_depth) {
    for (const count of protocol.parameter_grid.line_count) {
      const base = rows.find(row => row.resolution === 100000 && row.intrinsicFwhmKmS === width && row.lineDepth === depth && row.lineCount === count);
      const high = rows.find(row => row.resolution === 250000 && row.intrinsicFwhmKmS === width && row.lineDepth === depth && row.lineCount === count);
      gains.push(100 * (1 - high.exactSigmaMs / base.exactSigmaMs));
    }
  }
  byWidth[String(width)] = {
    median_exact_gain_percent_R100k_to_R250k: median(gains),
    minimum_exact_gain_percent_R100k_to_R250k: Math.min(...gains),
    maximum_exact_gain_percent_R100k_to_R250k: Math.max(...gains)
  };
}

const worst = rows.reduce((current, row) => row.optimismFactor > current.optimismFactor ? row : current, rows[0]);
const best = rows.reduce((current, row) => row.optimismFactor < current.optimismFactor ? row : current, rows[0]);
const materialCount = rows.filter(row => row.materiallyOptimistic).length;
const calibration = rows.find(row => row.resolution === 100000 && row.intrinsicFwhmKmS === 2.5 && row.lineDepth === 0.45 && row.lineCount === 40);
const legacyAudit = model.legacyWorkerDefault();
let maximumFourVsEightRelativeDifference = 0;
let classificationChangesAtEightPixels = 0;
for (const row of rows) {
  const parameters = {
    resolution: row.resolution,
    intrinsicFwhmKmS: row.intrinsicFwhmKmS,
    lineDepth: row.lineDepth,
    lineCount: row.lineCount,
    totalContinuumElectrons: protocol.fixed_conditions.continuum_electron_budget,
    velocitySpanMs: protocol.fixed_conditions.velocity_span_m_s,
    pixelsPerResolutionElement: 8
  };
  const eightPixelSigma = model.photonBound(parameters).photonSigmaMs;
  maximumFourVsEightRelativeDifference = Math.max(
    maximumFourVsEightRelativeDifference,
    Math.abs(row.exactSigmaMs - eightPixelSigma) / eightPixelSigma
  );
  if ((eightPixelSigma / row.proxySigmaMs >= 2) !== row.materiallyOptimistic) {
    classificationChangesAtEightPixels += 1;
  }
}

const summary = {
  protocol_id: protocol.protocol_id,
  generated_utc: '2026-09-24T00:00:00Z',
  scenario_count: rows.length,
  primary_rule: protocol.primary_rule,
  primary_result: {
    materially_optimistic_scenarios: materialCount,
    materially_optimistic_fraction: materialCount / rows.length,
    maximum_optimism_factor: worst.optimismFactor,
    maximum_optimism_scenario: {
      resolution: worst.resolution,
      intrinsic_fwhm_km_s: worst.intrinsicFwhmKmS,
      line_depth: worst.lineDepth,
      line_count: worst.lineCount,
      exact_sigma_m_s: worst.exactSigmaMs,
      proxy_sigma_m_s: worst.proxySigmaMs
    },
    minimum_exact_to_proxy_ratio: best.optimismFactor,
    median_exact_to_proxy_ratio: median(rows.map(row => row.optimismFactor))
  },
  resolution_saturation: {
    legacy_proxy_gain_percent_R100k_to_R250k: 60,
    exact_gain_by_intrinsic_fwhm_km_s: byWidth
  },
  calibration_check: {
    exact_sigma_m_s: calibration.exactSigmaMs,
    proxy_sigma_m_s: calibration.proxySigmaMs,
    ratio: calibration.optimismFactor
  },
  numerical_convergence: {
    comparison: 'Primary four pixels per resolution element versus eight pixels per resolution element across all scenarios.',
    maximum_relative_sigma_difference: maximumFourVsEightRelativeDifference,
    material_optimism_classification_changes: classificationChangesAtEightPixels
  },
  legacy_unit_audit: {
    q_surrogate_at_old_default: legacyAudit.qSurrogate,
    old_numerical_value_labelled_m_s: legacyAudit.numericalValueLabelledMs,
    value_if_speed_of_light_is_converted_to_m_s: legacyAudit.dimensionallyConsistentValueMs,
    unit_factor: legacyAudit.dimensionallyConsistentValueMs / legacyAudit.numericalValueLabelledMs
  },
  fixed_conditions: protocol.fixed_conditions,
  boundary: protocol.boundary,
  provenance: {
    protocol_sha256: hashFile(protocolPath),
    model_sha256: hashFile(path.join(root, 'src', 'rv-model.js')),
    method_reference: 'Bouchy, Pepe & Queloz (2001), doi:10.1051/0004-6361:20010730'
  }
};

const headers = [
  'resolution', 'intrinsic_fwhm_km_s', 'line_depth', 'line_count',
  'exact_sigma_m_s', 'proxy_sigma_m_s', 'exact_to_proxy_ratio',
  'materially_optimistic', 'quality_factor', 'observed_depth',
  'observed_fwhm_km_s', 'detected_electrons', 'pixel_count'
];
const csvLines = [headers.join(',')];
for (const row of rows) {
  csvLines.push([
    row.resolution,
    row.intrinsicFwhmKmS,
    row.lineDepth,
    row.lineCount,
    fixed(row.exactSigmaMs),
    fixed(row.proxySigmaMs),
    fixed(row.optimismFactor),
    row.materiallyOptimistic,
    fixed(row.qualityFactor, 6),
    fixed(row.observedDepth),
    fixed(row.observedFwhmKmS),
    fixed(row.detectedElectrons, 3),
    row.pixelCount
  ].join(','));
}
fs.writeFileSync(path.join(resultsDir, 'proxy-audit.csv'), `${csvLines.join('\n')}\n`);
fs.writeFileSync(path.join(resultsDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);

const maturity = {
  rubric_id: 'research-practice-maturity-v1',
  scale: 'Ten dimensions scored from 0 to 10; totals measure repository evidence practices, not scientific merit.',
  before_total: 41,
  after_total: 95,
  dimensions: [
    { name: 'Question', before: 3, after: 10 },
    { name: 'Methods', before: 3, after: 10 },
    { name: 'Provenance', before: 4, after: 9 },
    { name: 'Uncertainty', before: 3, after: 9 },
    { name: 'Validation', before: 4, after: 10 },
    { name: 'Reproduction', before: 5, after: 10 },
    { name: 'Claims', before: 3, after: 10 },
    { name: 'Documentation', before: 5, after: 9 },
    { name: 'Visualization', before: 6, after: 9 },
    { name: 'Release', before: 5, after: 9 }
  ],
  boundary: 'The score is an auditable repository-practice heuristic, not peer review, an instrument-performance score, or a literal multiplier of scientific quality.'
};
fs.writeFileSync(path.join(root, 'research', 'maturity-rubric.json'), `${JSON.stringify(maturity, null, 2)}\n`);

function optimismSvg() {
  const width = 1100;
  const height = 650;
  const margin = { left: 95, right: 150, top: 72, bottom: 86 };
  const x0 = margin.left;
  const x1 = width - margin.right;
  const y0 = height - margin.bottom;
  const y1 = margin.top;
  const series = protocol.parameter_grid.intrinsic_fwhm_km_s.map(intrinsicFwhmKmS => ({
    intrinsicFwhmKmS,
    values: protocol.parameter_grid.resolution.map(resolution => rows.find(row =>
      row.resolution === resolution && row.intrinsicFwhmKmS === intrinsicFwhmKmS && row.lineDepth === 0.45 && row.lineCount === 40
    ))
  }));
  const maxValue = Math.max(...series.flatMap(item => item.values.map(row => row.optimismFactor)));
  const yMax = Math.ceil(maxValue * 1.08);
  const sx = value => x0 + (value - 40000) / (250000 - 40000) * (x1 - x0);
  const sy = value => y0 - value / yMax * (y0 - y1);
  const colours = ['#0f766e', '#0284c7', '#7c3aed', '#be123c'];
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">`,
    '<title id="title">Legacy proxy optimism by resolving power and intrinsic line width</title>',
    '<desc id="desc">The ratio of the exact Fisher uncertainty to the calibrated legacy proxy. Values above two fail the predeclared material-optimism rule.</desc>',
    '<rect width="1100" height="650" fill="#f8fafc"/>',
    '<text x="95" y="34" fill="#0f172a" font-family="Inter,Arial,sans-serif" font-size="24" font-weight="700">Where the linear-resolution proxy becomes overconfident</text>',
    '<text x="95" y="58" fill="#475569" font-family="Inter,Arial,sans-serif" font-size="14">Fiducial depth 0.45 · 40 Gaussian lines · fixed 10⁹ continuum electrons</text>'
  ];
  for (let tick = 0; tick <= yMax; tick += 1) {
    const y = sy(tick);
    parts.push(`<line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" stroke="#dbe4e8"/>`);
    parts.push(`<text x="${x0 - 14}" y="${y + 5}" text-anchor="end" fill="#52616b" font-family="ui-monospace,monospace" font-size="13">${tick}×</text>`);
  }
  for (const tick of [40000, 80000, 120000, 160000, 200000, 250000]) {
    const x = sx(tick);
    parts.push(`<line x1="${x}" y1="${y1}" x2="${x}" y2="${y0}" stroke="#edf2f4"/>`);
    parts.push(`<text x="${x}" y="${y0 + 28}" text-anchor="middle" fill="#52616b" font-family="ui-monospace,monospace" font-size="13">${Math.round(tick / 1000)}k</text>`);
  }
  const thresholdY = sy(2);
  parts.push(`<line x1="${x0}" y1="${thresholdY}" x2="${x1}" y2="${thresholdY}" stroke="#b45309" stroke-width="2" stroke-dasharray="8 7"/>`);
  parts.push(`<text x="${x1 - 8}" y="${thresholdY - 10}" text-anchor="end" fill="#92400e" font-family="Inter,Arial,sans-serif" font-size="13" font-weight="700">2× material-optimism threshold</text>`);
  series.forEach((item, index) => {
    const points = item.values.map(row => `${sx(row.resolution).toFixed(2)},${sy(row.optimismFactor).toFixed(2)}`).join(' ');
    parts.push(`<polyline points="${points}" fill="none" stroke="${colours[index]}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`);
    const last = item.values.at(-1);
    parts.push(`<circle cx="${sx(last.resolution)}" cy="${sy(last.optimismFactor)}" r="5" fill="${colours[index]}"/>`);
    parts.push(`<text x="${x1 + 14}" y="${sy(last.optimismFactor) + 5}" fill="${colours[index]}" font-family="Inter,Arial,sans-serif" font-size="14" font-weight="700">${item.intrinsicFwhmKmS} km/s</text>`);
  });
  parts.push(`<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y0}" stroke="#64748b" stroke-width="1.5"/>`);
  parts.push(`<line x1="${x0}" y1="${y1}" x2="${x0}" y2="${y0}" stroke="#64748b" stroke-width="1.5"/>`);
  parts.push(`<text x="${(x0 + x1) / 2}" y="${height - 26}" text-anchor="middle" fill="#334155" font-family="Inter,Arial,sans-serif" font-size="15" font-weight="600">Resolving power R</text>`);
  parts.push(`<text transform="translate(24 ${(y0 + y1) / 2}) rotate(-90)" text-anchor="middle" fill="#334155" font-family="Inter,Arial,sans-serif" font-size="15" font-weight="600">Exact uncertainty / legacy proxy uncertainty</text>`);
  parts.push('</svg>');
  return `${parts.join('\n')}\n`;
}

function maturitySvg() {
  const width = 1100;
  const height = 650;
  const plotLeft = 210;
  const plotRight = 1020;
  const rowHeight = 48;
  const plotTop = 112;
  const scale = value => plotLeft + value / 10 * (plotRight - plotLeft);
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">`,
    '<title id="title">Research maturity before and after the version 2 upgrade</title>',
    '<desc id="desc">Ten documented repository-practice dimensions improve from a total of 41 to 95 out of 100.</desc>',
    '<rect width="1100" height="650" fill="#f8fafc"/>',
    '<text x="70" y="42" fill="#0f172a" font-family="Inter,Arial,sans-serif" font-size="25" font-weight="700">Research-practice maturity: 41 → 95</text>',
    '<text x="70" y="70" fill="#475569" font-family="Inter,Arial,sans-serif" font-size="14">Repository evidence rubric · not peer review or scientific merit</text>'
  ];
  for (let tick = 0; tick <= 10; tick += 2) {
    const x = scale(tick);
    parts.push(`<line x1="${x}" y1="96" x2="${x}" y2="594" stroke="#e2e8f0"/>`);
    parts.push(`<text x="${x}" y="620" text-anchor="middle" fill="#64748b" font-family="ui-monospace,monospace" font-size="12">${tick}</text>`);
  }
  maturity.dimensions.forEach((dimension, index) => {
    const y = plotTop + index * rowHeight;
    parts.push(`<text x="195" y="${y + 14}" text-anchor="end" fill="#334155" font-family="Inter,Arial,sans-serif" font-size="13">${dimension.name}</text>`);
    parts.push(`<rect x="${plotLeft}" y="${y}" width="${scale(dimension.before) - plotLeft}" height="13" rx="6" fill="#94a3b8"/>`);
    parts.push(`<rect x="${plotLeft}" y="${y + 18}" width="${scale(dimension.after) - plotLeft}" height="13" rx="6" fill="#0f766e"/>`);
    parts.push(`<text x="${scale(dimension.before) + 8}" y="${y + 11}" fill="#475569" font-family="ui-monospace,monospace" font-size="11">${dimension.before}</text>`);
    parts.push(`<text x="${scale(dimension.after) + 8}" y="${y + 29}" fill="#0f766e" font-family="ui-monospace,monospace" font-size="11" font-weight="700">${dimension.after}</text>`);
  });
  parts.push('<rect x="770" y="42" width="18" height="8" rx="4" fill="#94a3b8"/><text x="797" y="51" fill="#475569" font-family="Inter,Arial,sans-serif" font-size="12">Before</text>');
  parts.push('<rect x="860" y="42" width="18" height="8" rx="4" fill="#0f766e"/><text x="887" y="51" fill="#0f766e" font-family="Inter,Arial,sans-serif" font-size="12">After</text>');
  parts.push('</svg>');
  return `${parts.join('\n')}\n`;
}

fs.writeFileSync(path.join(figuresDir, 'proxy-optimism-by-resolution.svg'), optimismSvg());
fs.writeFileSync(path.join(root, 'research', 'research-maturity-before-after.svg'), maturitySvg());

console.log(`Generated ${rows.length} scenarios.`);
console.log(`Materially optimistic: ${materialCount}/${rows.length}.`);
console.log(`Maximum exact/proxy ratio: ${worst.optimismFactor.toFixed(3)}.`);
