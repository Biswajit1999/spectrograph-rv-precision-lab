"""Numerical and physics regression tests for conditional RV information."""
import unittest

import numpy as np

from research.rv_noise_budget import diagnostic_study, rv_bound


class TestRVNoiseBudget(unittest.TestCase):
    def test_matches_retained_js_fiducial(self):
        # research/results/summary.json, calibration_check.exact_sigma_m_s
        self.assertAlmostEqual(rv_bound()["sigma_noise_ms"], 1.1893414786857452, places=9)

    def test_photon_count_scaling(self):
        s = rv_bound()["sigma_noise_ms"]
        self.assertAlmostEqual(rv_bound(continuum_electrons=4e9)["sigma_noise_ms"], s / 2, places=10)

    def test_detector_noise_monotonic(self):
        sigmas = [rv_bound(read_noise_electrons=r)["sigma_noise_ms"] for r in (0, 10, 100)]
        self.assertTrue(sigmas[0] < sigmas[1] < sigmas[2])

    def test_background_noise_monotonic(self):
        self.assertGreater(rv_bound(background_electrons_per_pixel=100)["sigma_noise_ms"],
                           rv_bound()["sigma_noise_ms"])

    def test_throughput_reallocation(self):
        d = diagnostic_study()["throughput_allocation"]
        self.assertLess(d["deep_lines_favoured"], d["uniform"])
        self.assertGreater(d["shallow_lines_favoured"], d["uniform"])

    def test_identical_line_poisson_allocation_invariant(self):
        a = rv_bound(line_count=8)["sigma_noise_ms"]
        b = rv_bound(line_count=8, line_throughputs=np.arange(1, 9))["sigma_noise_ms"]
        self.assertAlmostEqual(a, b, places=10)

    def test_calibration_quadrature(self):
        a = rv_bound()["sigma_noise_ms"]
        b = rv_bound(calibration_sigma_ms=2)["sigma_with_calibration_ms"]
        self.assertAlmostEqual(b**2, a**2 + 4, places=10)

    def test_sampling_convergence(self):
        a = rv_bound(pixels_per_resolution_element=4)["sigma_noise_ms"]
        b = rv_bound(pixels_per_resolution_element=8)["sigma_noise_ms"]
        self.assertLess(abs(a - b) / a, 2e-5)

    def test_reject_invalid(self):
        for kw in ({"line_depths": 1}, {"resolution": 0},
                   {"line_throughputs": np.ones(3)}, {"read_noise_electrons": -1}):
            with self.subTest(kw=kw), self.assertRaises(ValueError):
                rv_bound(**kw)


if __name__ == "__main__":
    unittest.main()