const fs = require('node:fs');
const crypto = require('node:crypto');

const required = [
  'README.md', 'index.html', 'styles.css', 'app.js', 'physicsWorker.js',
  'src/rv-model.js', 'data/reference.json', 'research/protocol.json',
  'research/results/proxy-audit.csv', 'research/results/summary.json',
  'research/figures/proxy-optimism-by-resolution.svg', 'docs/METHODS.md',
  'docs/CLAIMS.md', 'docs/LIMITATIONS.md', 'docs/REPRODUCIBILITY.md'
];
const failures = [];
for (const file of required) if (!fs.existsSync(file)) failures.push(`${file} missing`);

if (!failures.length) {
  const protocol = JSON.parse(fs.readFileSync('research/protocol.json', 'utf8'));
  const summary = JSON.parse(fs.readFileSync('research/results/summary.json', 'utf8'));
  const references = JSON.parse(fs.readFileSync('data/reference.json', 'utf8'));
  const rows = fs.readFileSync('research/results/proxy-audit.csv', 'utf8').trim().split(/\r?\n/);
  const protocolHash = crypto.createHash('sha256').update(fs.readFileSync('research/protocol.json')).digest('hex');
  const modelHash = crypto.createHash('sha256').update(fs.readFileSync('src/rv-model.js')).digest('hex');
  if (summary.protocol_id !== protocol.protocol_id) failures.push('protocol/result identifier mismatch');
  if (summary.scenario_count !== 288 || rows.length !== 289) failures.push('scenario table must contain 288 data rows');
  if (summary.provenance.protocol_sha256 !== protocolHash) failures.push('protocol SHA-256 mismatch');
  if (summary.provenance.model_sha256 !== modelHash) failures.push('model SHA-256 mismatch');
  if (summary.numerical_convergence.maximum_relative_sigma_difference >= 2e-6) failures.push('sampling convergence exceeds tolerance');
  if (summary.numerical_convergence.material_optimism_classification_changes !== 0) failures.push('sampling changes primary classifications');
  if (!Array.isArray(references.sources) || references.sources.length !== 4) failures.push('source ledger must contain four primary records');
  for (const source of references.sources || []) {
    if (!source.doi || !source.url || !source.claim_boundary) failures.push(`incomplete source record ${source.id || 'unknown'}`);
  }
  const html = fs.readFileSync('index.html', 'utf8');
  for (const marker of ['skip-link', 'research/results/summary.json', 'Boundary of inference']) {
    if (!html.includes(marker)) failures.push(`index missing ${marker}`);
  }
  const combined = required.filter(file => fs.existsSync(file)).map(file => fs.readFileSync(file, 'utf8')).join('\n');
  for (const token of ['TO' + 'DO', 'PLACE' + 'HOLDER', 'insert ' + 'logic', 'coming ' + 'soon']) {
    if (combined.toLowerCase().includes(token.toLowerCase())) failures.push(`unfinished token ${token}`);
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('Spectrograph RV Precision Lab: research evidence and interface contracts passed.');
