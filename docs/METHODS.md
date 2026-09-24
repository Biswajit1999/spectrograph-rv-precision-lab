# Methods

## Research question

After calibration at one fiducial spectrum, does a proxy proportional to
`R × depth × sqrt(line count)` preserve a discrete photon-information lower
bound across line-width, depth, and density regimes?

## Synthetic spectrum

The experiment covers a fixed 3,000 km/s velocity interval containing equally
spaced, equal-depth Gaussian absorption lines. Intrinsic FWHM takes values 1,
2.5, 5, and 10 km/s. The Gaussian instrumental line-spread function has
`FWHM_inst = c/R`. Convolution gives

```text
σ_obs² = σ_intrinsic² + σ_instrument²
d_obs = d_intrinsic σ_intrinsic / σ_obs
```

The second relation conserves each line's Gaussian equivalent width. Lines are
sampled at four pixels per instrumental resolution element. A fixed `10⁹`
continuum-electron budget is divided over the pixels, so changing `R` changes
sampling but not coverage or the declared photon budget.

## Photon-information bound

For expected pixel electrons `Aᵢ` and a common velocity displacement `v`, the
independent-Poisson Fisher information is

```text
I(v) = Σᵢ (∂Aᵢ/∂v)² / Aᵢ
σᵥ = 1 / √I(v)
```

The implementation evaluates the Gaussian derivative analytically. Because the
declared lines occupy identical, effectively isolated cells, one cell is
integrated and its information and electron count are multiplied by the line
count; the full-grid sampling check below tests this numerical discretization.
The implementation also reports

```text
Q = c √[I(v) / Σᵢ Aᵢ]
```

so `σᵥ = c / [Q √(Σᵢ Aᵢ)]`, matching the Bouchy et al. quality-factor form.
Detector read noise, background, calibration error, tellurics, template error,
and stellar variability are intentionally zero or absent.

## Legacy comparator

The old relation is represented as a relative proxy

```text
σ_proxy ∝ 1 / [R × depth × √(line count) × √(electrons)]
```

It is normalized to the exact result at `R=100,000`, intrinsic FWHM 2.5 km/s,
depth 0.45, and 40 lines. Intrinsic width is omitted, as in the old model. This
calibration makes the audit a test of generalization rather than normalization.

## Grid and decision rule

The Cartesian grid contains 8 resolving powers × 4 widths × 3 depths × 3 line
counts = 288 scenarios. The proxy is predeclared materially optimistic when
`σ_exact / σ_proxy ≥ 2`. All rows are retained in the CSV.

## Numerical validation

The complete grid is repeated at eight pixels per resolution element. The
maximum relative difference from the four-pixel result is below `1.2e-6`
(0.00012%), and no scenario changes its material-optimism classification. Unit tests cover
photon-count scaling, independent-line scaling, equivalent-width conservation,
resolution saturation, calibration, Q-form equivalence, explicit parameter
failure, and the legacy unit defect.
