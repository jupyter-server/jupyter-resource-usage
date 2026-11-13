import threading
from unittest.mock import MagicMock
from unittest.mock import patch

import pytest

from jupyter_resource_usage.api import ApiHandler


@pytest.fixture(autouse=True)
def reset_sampling_state():
    ApiHandler._cpu_last_sampled = None
    ApiHandler._cpu_last_value = 0.0
    yield
    ApiHandler._cpu_last_sampled = None
    ApiHandler._cpu_last_value = 0.0


def make_process(value):
    p = MagicMock()
    p.cpu_percent.return_value = value
    return p


def test_sums_process_cpu_percent():
    procs = [make_process(10.0), make_process(5.5)]
    assert ApiHandler._sample_cpu_percent(procs) == 15.5


def test_reuses_value_within_min_interval():
    proc = make_process(40.0)
    with patch("jupyter_resource_usage.api.time.monotonic", side_effect=[100.0, 100.1]):
        first = ApiHandler._sample_cpu_percent([proc])
        proc.cpu_percent.return_value = 900.0
        second = ApiHandler._sample_cpu_percent([proc])
    assert first == second == 40.0
    assert proc.cpu_percent.call_count == 1


def test_resamples_after_min_interval():
    proc = make_process(40.0)
    with patch("jupyter_resource_usage.api.time.monotonic", side_effect=[100.0, 105.0]):
        ApiHandler._sample_cpu_percent([proc])
        proc.cpu_percent.return_value = 20.0
        assert ApiHandler._sample_cpu_percent([proc]) == 20.0
    assert proc.cpu_percent.call_count == 2


def test_dead_process_counts_as_zero():
    dead = MagicMock()
    dead.cpu_percent.side_effect = RuntimeError
    assert ApiHandler._sample_cpu_percent([dead, make_process(3.0)]) == 3.0


def test_concurrent_requests_sample_once():
    proc = make_process(25.0)
    results = []

    def call():
        results.append(ApiHandler._sample_cpu_percent([proc]))

    threads = [threading.Thread(target=call) for _ in range(8)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert results == [25.0] * 8
    assert proc.cpu_percent.call_count == 1
