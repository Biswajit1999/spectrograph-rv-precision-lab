# Limitations

- Lines are Gaussian, equal-depth, evenly spaced, and isolated enough to avoid
  strong blends. Real stellar spectra contain species-dependent asymmetry,
  blends, wavelength-dependent density, rotation, convection, and activity.
- The instrumental line-spread function is Gaussian and spatially invariant.
- The photon budget and velocity coverage are fixed by design. Throughput,
  blaze response, detector sampling, and exposure time are not modeled.
- Pixels have independent Poisson noise. Read noise, background, covariance,
  extraction, flat-fielding, wavelength calibration, barycentric correction,
  tellurics, and template mismatch are absent.
- The optional browser floor is an independent quadrature illustration. Real
  systematic and astrophysical terms can be time-correlated, wavelength-
  dependent, and non-Gaussian.
- The twofold decision threshold is a transparent engineering rule, not a
  community standard or statistical significance threshold.
- The finite grid cannot establish a global maximum error or an optimum
  resolving power.
- Published instrument values are heterogeneous contextual facts and are not
  validation observations for the synthetic model.
