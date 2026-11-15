# Conditional Doppler information lost to masked pixels

The standalone Python module `research/pixel_mask_sensitivity.py` evaluates two complementary diagnostics: leave-one-pixel-out information loss and user-supplied pixel-mask sensitivity. For independent Poisson pixels with positive expected electron counts A_i and a known derivative dA_i/dv, the information is sum((dA_i/dv)^2/A_i). The inverse square root is the conditional 1-sigma velocity lower bound in m/s when the supplied derivatives use m/s.

No detector noise, wavelength covariance, template mismatch, nuisance continuum fitting, line-spread uncertainty, or barycentric systematics are included. Pixel deletion retains the original expected counts in remaining pixels; it does not redistribute photons. The no-information limit is infinite uncertainty. This module does not replace the 288-scenario published audit.

Reproduce: `PYTHONPATH=. python -m pytest -q tests/test_pixel_mask_sensitivity.py`. Synthetic test inputs only; no new instrument-performance measurement.

Development disclosure: scientific code and tests were prepared with AI coding assistance for review under Biswajit Jana's authenticated GitHub identity. No co-authors are asserted.
