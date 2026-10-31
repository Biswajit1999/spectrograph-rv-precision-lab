# Conditional RV information under detector and calibration nuisance terms

This independent Python extension follows the Gaussian-line and fixed-continuum-electron conventions of `src/rv-model.js`. It reproduces the retained photon-only fiducial `1.1893414786857452 m/s` to numerical precision, then changes one assumption at a time. It does not replace the original frozen 288-scenario protocol or its CSV.

Three distinct questions are tested: (1) how additive sky/background and detector read variance degrade the mean-derivative RV information, (2) how distributing a fixed photon budget among unequal-depth lines changes information, and (3) how a Gaussian wavelength-zero-point prior contributes when a calibration shift is degenerate with stellar RV.

For expected source electrons `A_i`, known background variance `B_i`, and read-noise variance `R_i²`, the conditional mean-only Fisher approximation is `I = Σ (∂A_i/∂v)² / (A_i + B_i + R_i²)`. In the zero-background/read limit this is the exact independent-Poisson Fisher information. For nonzero read noise it is **not** the full mixed Poisson-Gaussian Fisher likelihood, nor a fitted detector model. Independent calibration uncertainty `σ_cal` is combined as `σ_total² = I⁻¹ + σ_cal²` because a free common zero point is exactly degenerate with a stellar shift.

## Reproduce

From the repository root with Python 3.11+ and NumPy installed:

```bash
python -m unittest discover -s tests -p 'test_rv_noise_budget.py' -v
python research/rv_noise_budget.py
```

## Numerical example (seedless deterministic synthetic model)

At R=100,000, 40 equal lines, 10⁹ continuum electrons: read noise 0/10/30/100 e⁻ per pixel gives conditional σ(RV) = 1.18934/1.18963/1.19191/1.21759 m/s. For line depths increasing from 0.15 to 0.75, uniform/strong-line-favoured/weak-line-favoured throughput allocations give 1.07229/0.95479/1.24758 m/s at fixed total continuum electrons. Adding a hypothetical independent 1 m/s wavelength zero-point prior increases the fiducial total uncertainty to 1.55388 m/s.

No physical blaze function, sky spectrum, real CCD read-noise measurement, wavelength-solution covariance, stellar activity, or measured RV precision is inferred. Throughput reallocation is a controlled allocation experiment, not a proposed observational efficiency gain.