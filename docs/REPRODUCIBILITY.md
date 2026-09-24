# Reproducibility

## Environment

- Node.js 20, 22, or 24
- No npm dependencies
- No network access required after cloning

## One-command replay

```bash
npm run verify
```

`npm run research` regenerates the 288-row CSV, summary JSON, proxy-comparison
SVG, maturity rubric, and before/after SVG with canonical LF line endings.
`npm test` runs the numerical contracts. `npm run check` validates syntax,
evidence counts, source-ledger structure, SHA-256 bindings, convergence, and
required interface language.

## Integrity bindings

The summary records SHA-256 for `research/protocol.json` and
`src/rv-model.js`. Validation recomputes both hashes. If the question/grid or
scientific implementation changes without regenerating the evidence, the build
fails.

## Determinism

No pseudorandom values are used. Line positions and the parameter grid are
fully specified. The generated timestamp is a release identifier rather than
wall-clock state, preventing meaningless byte changes on replay.

## Expected headline

```text
Generated 288 scenarios.
Materially optimistic: 39/288.
Maximum exact/proxy ratio: 2.924.
```
