"""Conditional photon, detector and calibration RV information budgets.

The synthetic Gaussian-line conventions reproduce src/rv-model.js. No measured
spectrograph performance or wavelength-calibration covariance is inferred.
"""
from __future__ import annotations

import numpy as np

C_MS = 299_792_458.0
FWHM_TO_SIGMA = 1 / (2 * np.sqrt(2 * np.log(2)))


def rv_bound(
    resolution: float = 100_000,
    intrinsic_fwhm_kms: float = 2.5,
    line_depths: float | np.ndarray = 0.45,
    line_count: int = 40,
    continuum_electrons: float = 1e9,
    velocity_span_ms: float = 3e6,
    pixels_per_resolution_element: float = 4,
    background_electrons_per_pixel: float = 0,
    read_noise_electrons: float = 0,
    line_throughputs: np.ndarray | None = None,
    calibration_sigma_ms: float = 0,
) -> dict[str, float]:
    """Compute a fixed-variance mean-derivative Fisher approximation.

    Poisson-only values are exact Poisson Fisher information. When detector
    noise is present, V=expected source counts+background+read_variance is
    held fixed while differentiating the mean (not the full Poisson-Gaussian
    likelihood). The calibration term is an independent Gaussian shift prior.
    """
    positive = (resolution, intrinsic_fwhm_kms, continuum_electrons,
                velocity_span_ms, pixels_per_resolution_element)
    if any(not np.isfinite(v) or v <= 0 for v in positive):
        raise ValueError("resolution, widths, photons, span and sampling must be positive finite")
    if not isinstance(line_count, int) or line_count < 1:
        raise ValueError("line_count must be a positive integer")
    if any(not np.isfinite(v) or v < 0 for v in
           (background_electrons_per_pixel, read_noise_electrons, calibration_sigma_ms)):
        raise ValueError("noise and calibration uncertainties must be nonnegative finite")
    depths = np.broadcast_to(np.asarray(line_depths, dtype=float), (line_count,))
    if np.any(~np.isfinite(depths)) or np.any((depths <= 0) | (depths >= 1)):
        raise ValueError("all intrinsic line depths must lie strictly between 0 and 1")
    weights = (np.ones(line_count) if line_throughputs is None
               else np.asarray(line_throughputs, dtype=float))
    if weights.shape != (line_count,) or np.any(~np.isfinite(weights)) or np.any(weights <= 0):
        raise ValueError("line throughputs must be positive finite, one per line")
    weights = weights / np.mean(weights)  # fixed total continuum-electron budget
    cell_width = velocity_span_ms / line_count
    nominal_pixel = C_MS / resolution / pixels_per_resolution_element
    n_cell = max(12, round(cell_width / nominal_pixel))
    pixel_width = velocity_span_ms / (n_cell * line_count)
    x = (np.arange(n_cell) + 0.5) * pixel_width - cell_width / 2
    sigma_intr = intrinsic_fwhm_kms * 1000 * FWHM_TO_SIGMA
    sigma_obs = np.hypot(sigma_intr, C_MS / resolution * FWHM_TO_SIGMA)
    depths_obs = depths * sigma_intr / sigma_obs
    gaussian = np.exp(-0.5 * (x / sigma_obs) ** 2)
    flux = 1 - depths_obs[:, None] * gaussian[None, :]
    derivative = depths_obs[:, None] * gaussian[None, :] * x[None, :] / sigma_obs**2
    continuum_per_pixel = continuum_electrons / (n_cell * line_count)
    continuum = continuum_per_pixel * weights[:, None]
    source = continuum * flux
    dsource = continuum * derivative
    variance = source + background_electrons_per_pixel + read_noise_electrons**2
    information = float(np.sum(dsource**2 / variance))
    sigma_photon_detector = information ** -0.5
    sigma_with_calibration = float(np.hypot(sigma_photon_detector, calibration_sigma_ms))
    return {
        "sigma_noise_ms": sigma_photon_detector,
        "sigma_with_calibration_ms": sigma_with_calibration,
        "fisher_per_ms2": information,
        "detected_source_electrons": float(np.sum(source)),
        "pixel_count": int(n_cell * line_count),
        "observed_sigma_ms": float(sigma_obs),
    }


def diagnostic_study() -> dict[str, object]:
    """Three independent controlled stress tests, with no observational input."""
    baseline = rv_bound()
    detector = {str(read): rv_bound(read_noise_electrons=read)
                ["sigma_noise_ms"] for read in (0, 10, 30, 100)}
    depths = np.linspace(0.15, 0.75, 40)
    weights = np.linspace(0.4, 1.6, 40)
    blaze = {
        "uniform": rv_bound(line_depths=depths)["sigma_noise_ms"],
        "deep_lines_favoured": rv_bound(line_depths=depths, line_throughputs=weights)["sigma_noise_ms"],
        "shallow_lines_favoured": rv_bound(line_depths=depths, line_throughputs=weights[::-1])["sigma_noise_ms"],
    }
    calibration = {str(floor): rv_bound(calibration_sigma_ms=floor)
                   ["sigma_with_calibration_ms"] for floor in (0, 0.5, 1, 3)}
    return {"baseline": baseline, "read_noise_electrons": detector,
            "throughput_allocation": blaze, "calibration_sigma_ms": calibration}


if __name__ == "__main__":
    import json
    print(json.dumps(diagnostic_study(), indent=2))