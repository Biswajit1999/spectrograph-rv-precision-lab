# Claim ledger

| ID | Claim | Status | Evidence | Boundary |
|---|---|---|---|---|
| C1 | The legacy worker mixed km/s and m/s, a factor of 1,000. | Reproduced | `legacy_unit_audit` in `research/results/summary.json` and a unit test | This diagnoses the old equation; it does not calibrate the surrogate. |
| C2 | The calibrated proxy is at least twofold optimistic in 39/288 declared scenarios. | Reproduced | Complete scenario CSV and summary JSON | Conditional on the synthetic Gaussian-line design and fixed photon budget. |
| C3 | The maximum exact/proxy uncertainty ratio is 2.924. | Reproduced | R=40,000, FWHM=1 km/s, depth=0.2, 80 lines in the CSV | A grid maximum, not a universal worst case. |
| C4 | From R=100,000 to 250,000, the median exact gain is 5.86% for 10 km/s lines while the proxy claims 60%. | Reproduced | Resolution-saturation section of the summary | Does not forecast any named star or spectrograph. |
| C5 | ESPRESSO reports better than 0.25 m/s during one night and 0.50 m/s over several months. | Citation-only | Pepe et al. (2021) | Kept as literature context, not reproduced or plotted as a comparable model point. |
| C6 | EXPRES reports a formal 0.3 m/s single-measurement error at per-pixel S/N 250 and 0.895 m/s residual RMS for 51 Peg. | Citation-only | Petersburg et al. (2020) | The two reported quantities are different estimands. |

## Claims not made

- No named instrument is predicted, ranked, or independently validated.
- No planet is detected and no planet-mass completeness limit is estimated.
- The Fisher bound is not an achieved precision, error bar on real data, or
  exposure-time estimate.
- The maturity score is not peer review or scientific impact.
