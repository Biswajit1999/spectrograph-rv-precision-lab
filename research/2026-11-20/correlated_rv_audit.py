"""Conditional RV covariance audit; synthetic Gaussian residual model.
AI-assisted implementation; Biswajit Jana is the requested scientific reviewer.
This is not achieved instrument precision or a calibrated noise model.
"""
import math
import unittest


def solve(matrix, vector):
    """Dense Gaussian elimination with partial pivoting; positive-definite input."""
    n = len(vector)
    if len(matrix) != n or any(len(row) != n for row in matrix):
        raise ValueError("matrix shape")
    a = [list(map(float, row)) + [float(v)] for row, v in zip(matrix, vector)]
    for k in range(n):
        pivot = max(range(k, n), key=lambda i: abs(a[i][k]))
        a[k], a[pivot] = a[pivot], a[k]
        if not math.isfinite(a[k][k]) or abs(a[k][k]) < 1e-14:
            raise ValueError("singular covariance")
        for i in range(k + 1, n):
            factor = a[i][k] / a[k][k]
            for j in range(k, n + 1):
                a[i][j] -= factor * a[k][j]
    x = [0.0] * n
    for i in range(n - 1, -1, -1):
        x[i] = (a[i][n] - sum(a[i][j] * x[j] for j in range(i + 1, n))) / a[i][i]
    return x


def rv_bound(gradient, sigma, rho=0):
    """sqrt(1/(g^T C^-1 g)); C_ij=sigma_i sigma_j rho^|i-j|.
    Gradient units: electrons/(m/s); sigma units: electrons.
    AR(1) is an assumed pixel-order covariance, not empirical calibration.
    """
    g, s = list(gradient), list(sigma)
    n = len(g)
    if n < 2 or len(s) != n or not (-1 < rho < 1):
        raise ValueError("shape or rho")
    if any(not math.isfinite(v) for v in g+s+[rho]) or any(v <= 0 for v in s):
        raise ValueError("nonfinite or nonpositive noise")
    c = [[s[i]*s[j]*rho**abs(i-j) for j in range(n)] for i in range(n)]
    z = solve(c, g)
    info = sum(a*b for a,b in zip(g,z))
    if info <= 0 or not math.isfinite(info):
        raise ValueError("no velocity information")
    return 1/math.sqrt(info)


def rho_sweep(gradient, sigma, correlations):
    """Sensitivity curve; do not infer rho from this diagnostic."""
    return [(rho, rv_bound(gradient, sigma, rho)) for rho in correlations]


class SyntheticTests(unittest.TestCase):
    def test_diagonal(self):
        self.assertAlmostEqual(rv_bound([3,4],[1,1]), .2)
    def test_noise_scaling(self):
        self.assertAlmostEqual(rv_bound([3,4],[2,2]), .4)
    def test_gradient_scaling(self):
        self.assertAlmostEqual(rv_bound([6,8],[1,1]), .1)
    def test_two_pixel_analytic(self):
        self.assertAlmostEqual(rv_bound([1,1],[1,1],.5), math.sqrt(.75))
    def test_invalid(self):
        with self.assertRaises(ValueError):
            rv_bound([1,1],[1,0])


if __name__ == "__main__":
    unittest.main()
