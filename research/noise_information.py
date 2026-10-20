"""Independent synthetic RV Fisher diagnostics for detector noise and spectral masks.

Matches the sampling/line-broadening convention of ``src/rv-model.js``.
All quantities are illustrative; no observed spectra or instrument read-noise
characteristics are inferred. Read-noise weighting is a *mean-only*
quasi-Fisher approximation, not an exact Poisson-Gaussian likelihood.
"""
from __future__ import annotations

from dataclasses import dataclass
from math import log, sqrt

import numpy as np

C_MS = 299_792_458.0
FWHM_TO_SIGMA = 1.0 / (2.0 * sqrt(2.0 * log(2.0)))


@dataclass(frozen=True)
class SpectrumSettings:
    resolution: float = 100_000.0
    intrinsic_fwhm_km_s: float = 2.5
    line_depth: float = 0.45
    line_count: int = 40
    continuum_electrons: float = 1e9
    velocity_span_ms: float = 3e6
    pixels_per_resolution_element: float = 4.0


def sampled_cell(settings: SpectrumSettings) -> tuple[np.ndarray, np.ndarray, np.ndarray, float]:
    """Return velocity offsets, expected electrons, and shift derivatives per cell."""
    p = settings
    if not (np.isfinite(p.resolution) and p.resolution > 0 and
            np.isfinite(p.intrinsic_fwhm_km_s) and p.intrinsic_fwhm_km_s > 0 and
            np.isfinite(p.line_depth) and 0 < p.line_depth < 1 and
            isinstance(p.line_count, int) and p.line_count > 0 and
            np.isfinite(p.continuum_electrons) and p.continuum_electrons > 0 and
            np.isfinite(p.velocity_span_ms) and p.velocity_span_ms > 0 and
            np.isfinite(p.pixels_per_resolution_element) and p.pixels_per_resolution_element > 0):
        raise ValueError("Invalid spectrum parameters")
    cell_width = p.velocity_span_ms / p.line_count
    nominal_pixel_width = C_MS / p.resolution / p.pixels_per_resolution_element
    pixels_per_line = max(12, round(cell_width / nominal_pixel_width))
    pixel_width = cell_width / pixels_per_line
    offsets = (np.arange(pixels_per_line) + 0.5) * pixel_width - cell_width / 2
    intrinsic_sigma = p.intrinsic_fwhm_km_s * 1000 * FWHM_TO_SIGMA
    instrument_sigma = C_MS / p.resolution * FWHM_TO_SIGMA
    observed_sigma = np.hypot(intrinsic_sigma, instrument_sigma)
    observed_depth = p.line_depth * intrinsic_sigma / observed_sigma
    profile = np.exp(-0.5 * (offsets / observed_sigma)**2)
    continuum_per_pixel = p.continuum_electrons / (pixels_per_line * p.line_count)
    electrons = continuum_per_pixel * (1 - observed_depth * profile)
    derivative = continuum_per_pixel * observed_depth * profile * offsets / observed_sigma**2
    return offsets, electrons, derivative, observed_sigma


def noise_weighted_bound(settings: SpectrumSettings, read_noise_e: float = 0.0,
                         core_mask_sigma: float = 0.0) -> dict[str, float]:
    """Mean-only Fisher bound for independent photon+Gaussian read variance.

    ``core_mask_sigma`` discards |velocity offset| < core_mask_sigma *
    observed line sigma from *every* line, representing a controlled mask
    experiment rather than a telluric correction.
    """
    if not np.isfinite(read_noise_e) or read_noise_e < 0:
        raise ValueError("read_noise_e must be finite and nonnegative")
    if not np.isfinite(core_mask_sigma) or core_mask_sigma < 0:
        raise ValueError("core_mask_sigma must be finite and nonnegative")
    offsets, electrons, derivative, sigma = sampled_cell(settings)
    variance = electrons + read_noise_e**2
    information = derivative**2 / variance
    all_information = float(information.sum() * settings.line_count)
    retained = np.abs(offsets) >= core_mask_sigma * sigma
    kept_information = float(information[retained].sum() * settings.line_count)
    if kept_information <= 0:
        raise ValueError("No Doppler information survives the spectral mask")
    return {
        "sigma_rv_ms": 1.0 / sqrt(kept_information),
        "fisher_per_ms2": kept_information,
        "information_retained_fraction": kept_information / all_information,
        "pixel_count": int(len(offsets) * settings.line_count),
        "mean_electrons_per_pixel": float(electrons.mean()),
    }


def resolution_sensitivity(settings: SpectrumSettings, resolutions: np.ndarray,
                           read_noise_e: float = 0.0) -> dict[str, np.ndarray | float]:
    """Controlled R scan at fixed continuum electrons and velocity span."""
    grid = np.asarray(resolutions, dtype=float)
    if grid.ndim != 1 or len(grid) < 2 or not np.all(np.isfinite(grid)) or np.any(grid <= 0):
        raise ValueError("Provide at least two positive finite resolutions")
    bounds = np.asarray([noise_weighted_bound(
        SpectrumSettings(**{**vars(settings), "resolution": float(r)}), read_noise_e
    )["sigma_rv_ms"] for r in grid])
    return {"resolutions": grid, "sigma_rv_ms": bounds,
            "best_resolution": float(grid[np.argmin(bounds)]),
            "relative_improvement_first_to_last": float(1 - bounds[-1] / bounds[0])}
