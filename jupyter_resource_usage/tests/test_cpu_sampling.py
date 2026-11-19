from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from jupyter_resource_usage.api import ApiHandler
from jupyter_resource_usage.config import ResourceUseDisplay


@pytest.fixture(autouse=True)
def reset_sample():
    ApiHandler._cpu_sample = None
    yield
    ApiHandler._cpu_sample = None


def make_handler(interval):
    config = ResourceUseDisplay(cpu_sample_interval=interval)
    return SimpleNamespace(
        settings={"jupyter_resource_usage_display_config": config},
    )


def sample(handler, process):
    # the underlying function, without the thread pool
    return ApiHandler._get_cpu_percent.__wrapped__(handler, [process])


def test_requests_within_the_interval_share_one_measurement():
    process = MagicMock()
    process.cpu_percent.side_effect = [10.0, 99.0]
    handler = make_handler(interval=60)

    assert sample(handler, process) == 10.0
    assert sample(handler, process) == 10.0
    assert process.cpu_percent.call_count == 1


def test_a_new_measurement_is_taken_once_the_interval_has_passed():
    process = MagicMock()
    process.cpu_percent.side_effect = [10.0, 99.0]
    handler = make_handler(interval=0)

    assert sample(handler, process) == 10.0
    assert sample(handler, process) == 99.0
    assert process.cpu_percent.call_count == 2
