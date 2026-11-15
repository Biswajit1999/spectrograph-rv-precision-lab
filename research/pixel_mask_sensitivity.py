"""Conditional sampling and pixel-loss sensitivity for Doppler Fisher information.

Independent Poisson pixels; derivatives are supplied in electrons per (m/s).
This is a lower bound, not achieved instrumental precision.
"""
import math


def fisher_bound(counts, gradients, keep=None):
    """Return information and 1-sigma velocity bound for retained pixels."""
    if len(counts) != len(gradients) or not counts:
        raise ValueError('equal nonempty pixel arrays required')
    if keep is None:
        keep = [True] * len(counts)
    if len(keep) != len(counts):
        raise ValueError('mask length mismatch')
    information = 0.0
    for count, gradient, selected in zip(counts, gradients, keep):
        if not math.isfinite(count) or count <= 0 or not math.isfinite(gradient):
            raise ValueError('finite positive expected counts and finite gradients required')
        if selected:
            information += gradient * gradient / count
    return information, (1.0 / math.sqrt(information) if information > 0 else math.inf)


def leave_one_pixel_out(counts, gradients):
    """Return full bound and deletion bounds; highlights influential pixels."""
    _, full = fisher_bound(counts, gradients)
    deleted = [fisher_bound(counts, gradients, [i != j for i in range(len(counts))])[1]
               for j in range(len(counts))]
    return full, deleted


def mask_sensitivity(counts, gradients, masks):
    """Compare externally supplied pixel masks without changing the photon budget."""
    return [fisher_bound(counts, gradients, mask)[1] for mask in masks]
