# Baseline audit

Baseline revision: `5a5174680f199deaec70f880ab149e9b14313b05`

## Material scientific findings

1. **Velocity units were inconsistent.** The worker declared
   `C=299792.458`, a km/s value, then labelled `C/(Q*SNR)` as m/s. At the old
   default this produced 3.218 labelled m/s; a direct unit conversion produces
   3218.384 m/s with the same surrogate.
2. **The displayed Q factor was not the Bouchy quality factor.** It was defined
   as `1800 × resolution_scale × depth × sqrt(density)` without a spectrum,
   wavelength derivatives, detected-electron count, calibration record, or
   dimensional derivation.
3. **Linear resolving-power scaling could not saturate.** The proxy improved as
   `1/R` indefinitely, even after instrumental broadening should become small
   relative to the intrinsic stellar line width.
4. **SNR was under-specified.** A per-pixel SNR was inserted into a compact
   expression without binding it to pixel sampling, total detected electrons,
   wavelength coverage, or a concrete spectrum.
5. **Planet-mass values were not detection limits.** Setting `K=5σ` for one
   precision value omitted visit count, phase coverage, period search,
   nuisance parameters, activity, correlated noise, and completeness.
6. **Benchmark points mixed estimands.** Approximate design precision, formal
   internal error, short-term precision, and orbital-fit residual RMS were
   plotted as though they were directly comparable observations.
7. **Validation was structural, not scientific.** It checked file presence,
   finite hand-entered points, citations, and scaffold tokens, but did not test
   the numerical equation or regenerate evidence.

## Interface findings

- The desktop body was forcibly non-scrollable and the application occupied a
  fixed viewport grid.
- The main evidence lived in canvas pixels without a data table or meaningful
  text equivalent.
- A fixed dismissible overlay obscured content and asserted research quality
  without linking to generated evidence.
- Controls and telemetry used internal variable names rather than interpretive
  scientific language.

Version 2 removes the mass-detection claim and mixed benchmark plot, replaces
the equation, publishes every scenario, adds numerical tests and CI, and makes
the boundary visible beside the result.
