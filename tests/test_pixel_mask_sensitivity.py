import math
import pytest
from research.pixel_mask_sensitivity import fisher_bound, leave_one_pixel_out, mask_sensitivity


def test_exact_two_pixel_bound():
    info, sigma = fisher_bound([4., 9.], [2., 3.])
    assert info == pytest.approx(2.)
    assert sigma == pytest.approx(1 / math.sqrt(2))


def test_discarding_information_cannot_improve_bound():
    full, losses = leave_one_pixel_out([4., 9.], [2., 3.])
    assert all(x >= full for x in losses)


def test_masked_all_pixels_has_infinite_uncertainty():
    assert math.isinf(fisher_bound([10.], [2.], [False])[1])


def test_mask_sensitivity():
    result = mask_sensitivity([4., 9.], [2., 3.], [[True, True], [True, False]])
    assert result == pytest.approx([1 / math.sqrt(2), 1.])


def test_reject_invalid_counts_and_shapes():
    with pytest.raises(ValueError):
        fisher_bound([0.], [1.])
    with pytest.raises(ValueError):
        fisher_bound([1.], [1., 2.])
