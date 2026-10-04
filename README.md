# Spectrograph RV Precision Lab

A reproducible test of a common radial-velocity shortcut: treating Doppler
information as proportional to resolving power, line depth, and the square root
of line count. The version 2 study replaces the old undocumented quality-factor
surrogate with the discrete photon-information bound of Bouchy, Pepe & Queloz
(2001).

[Open the evidence surface](https://biswajit1999.github.io/spectrograph-rv-precision-lab/)
· [Read the protocol](research/protocol.json)
· [Inspect all 288 scenarios](research/results/proxy-audit.csv)
· [Review the claims](docs/CLAIMS.md)

## Result

The legacy proxy is calibrated to the exact model at one fiducial spectrum, then
tested over 8 resolving powers, 4 intrinsic line widths, 3 depths, and 3 line
counts. It is at least twofold too optimistic in **39 of 288 scenarios**. The
largest exact-to-proxy uncertainty ratio is **2.924**, at `R=40,000`, intrinsic
FWHM `1 km/s`, depth `0.2`, and 80 lines.

The assumed linear improvement with resolving power also misses saturation for
broad stellar lines. From `R=100,000` to `R=250,000`, the proxy always claims a
60% uncertainty reduction. The exact median reduction is only **5.86%** for
intrinsic FWHM `10 km/s`, compared with **66.89%** for `1 km/s` lines.

The original worker had a separate dimensional defect: it used the speed of
light in km/s while labelling the result m/s. At its default settings the shown
number was `3.218`; using consistent m/s units with the same undocumented
surrogate gives `3218.384`. Version 2 removes that equation rather than hiding
the mismatch behind a new calibration.

## What is computed

For each synthetic spectrum, Gaussian intrinsic lines are convolved with a
Gaussian instrumental line-spread function. Equivalent width is conserved.
The continuum electron budget and velocity coverage are fixed while resolving
power changes. The code evaluates the independent-Poisson Fisher information
for a common Doppler shift:

```text
I(v) = Σᵢ [1 / Aᵢ] [∂Aᵢ / ∂v]²
σᵥ,photon = 1 / √I(v)
Q = c √[I(v) / Σᵢ Aᵢ]
```

This is algebraically equivalent to `σᵥ = c / (Q √Nₑ)` for the declared
discrete spectrum. It is a lower bound under the model—not an achieved RV
precision.

## Reproduce

Node.js 20 or newer is sufficient; there are no runtime dependencies.

```bash
npm run verify
```

That command regenerates the full CSV, JSON summary, scientific figure, and
maturity comparison; runs the numerical tests; checks source/model hashes; and
validates the public evidence surface. The primary four-pixels-per-resolution-
element calculation was repeated at eight pixels per resolution element. The
maximum relative change is below `1.2e-6` (0.00012%), with zero changes to the
39 primary classifications.

## Evidence map

| Evidence | Location |
|---|---|
| Frozen question and grid | [`research/protocol.json`](research/protocol.json) |
| Complete scenario table | [`research/results/proxy-audit.csv`](research/results/proxy-audit.csv) |
| Machine-readable headline results | [`research/results/summary.json`](research/results/summary.json) |
| Comparison figure | [`research/figures/proxy-optimism-by-resolution.svg`](research/figures/proxy-optimism-by-resolution.svg) |
| Scientific implementation | [`src/rv-model.js`](src/rv-model.js) |
| Methods and equations | [`docs/METHODS.md`](docs/METHODS.md) |
| Claim ledger | [`docs/CLAIMS.md`](docs/CLAIMS.md) |
| Limitations | [`docs/LIMITATIONS.md`](docs/LIMITATIONS.md) |
| Replay contract | [`docs/REPRODUCIBILITY.md`](docs/REPRODUCIBILITY.md) |
| Baseline audit | [`docs/BASELINE_AUDIT.md`](docs/BASELINE_AUDIT.md) |

## Boundary of inference

This is a controlled synthetic Fisher-information experiment. It is not an
end-to-end spectrograph forecast, exposure-time calculator, stellar-template
analysis, wavelength-calibration model, or planet-detection completeness study.
The optional quadrature floor in the browser is an illustrative independent
repeatability term; it is not a measured property of any instrument. Published
ESPRESSO and EXPRES performance values are kept in a contextual source ledger
and are not pooled as interchangeable points.

## Primary references

- Bouchy, F., Pepe, F. & Queloz, D. (2001), *A&A* 374, 733–739.
  <https://doi.org/10.1051/0004-6361:20010730>
- Pepe, F. et al. (2021), *A&A* 645, A96.
  <https://doi.org/10.1051/0004-6361/202038306>
- Petersburg, R. R. et al. (2020), *AJ* 159, 187.
  <https://doi.org/10.3847/1538-3881/ab7e31>
- Fischer, D. A. et al. (2016), *PASP* 128, 066001.
  <https://doi.org/10.1088/1538-3873/128/964/066001>

## License

Code is available under the [MIT License](LICENSE). Citation metadata are in
[`CITATION.cff`](CITATION.cff).
