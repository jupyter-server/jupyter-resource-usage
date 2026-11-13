import asyncio
import json
from collections import namedtuple
from types import SimpleNamespace
from unittest.mock import MagicMock
from unittest.mock import patch

import pytest

from jupyter_resource_usage.api import ApiHandler
from jupyter_resource_usage.config import ResourceUseDisplay

MemoryInfo = namedtuple("MemoryInfo", ["rss"])


def get_metrics(cpu_percent, cpu_limit, threshold=0.1):
    """Run the handler with the given CPU usage, in percent of one CPU."""
    process = MagicMock()
    process.children.return_value = []
    process.memory_full_info.return_value = MemoryInfo(rss=100)
    config = ResourceUseDisplay(
        cpu_limit=cpu_limit,
        cpu_warning_threshold=threshold,
        track_cpu_percent=True,
        track_disk_usage=False,
    )

    async def get_cpu_percent(processes):
        return cpu_percent

    written = []
    handler = SimpleNamespace(
        settings={"jupyter_resource_usage_display_config": config},
        write=written.append,
        _get_cpu_percent=get_cpu_percent,
    )
    with patch("jupyter_resource_usage.api.psutil.Process", return_value=process):
        # the underlying coroutine, without the authentication check
        asyncio.run(ApiHandler.get.__wrapped__(handler))
    return json.loads(written[0])


@pytest.mark.parametrize(
    "cpu_percent, cpu_limit, warn",
    [
        # the limit is a number of CPUs, as set by JupyterHub in CPU_LIMIT
        (18, 1, False),
        (85, 1, False),
        (95, 1, True),
        (150, 2, False),
        (185, 2, True),
        (100, 0.5, True),
    ],
)
def test_cpu_warning_compares_against_the_limit_in_cpus(cpu_percent, cpu_limit, warn):
    limits = get_metrics(cpu_percent, cpu_limit)["limits"]
    assert limits["cpu"]["cpu"] == cpu_limit
    assert limits["cpu"]["warn"] is warn


def test_cpu_warning_threshold_is_respected():
    assert get_metrics(70, 1, threshold=0.2)["limits"]["cpu"]["warn"] is False
    assert get_metrics(70, 1, threshold=0.4)["limits"]["cpu"]["warn"] is True


def test_no_cpu_warning_when_threshold_is_zero():
    assert "warn" not in get_metrics(99, 1, threshold=0)["limits"]["cpu"]


def test_no_cpu_limit_when_not_set():
    assert "cpu" not in get_metrics(99, 0)["limits"]
