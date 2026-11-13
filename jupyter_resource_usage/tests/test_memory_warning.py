import asyncio
import json
from collections import namedtuple
from types import SimpleNamespace
from unittest.mock import MagicMock
from unittest.mock import patch

import pytest

from jupyter_resource_usage.api import ApiHandler
from jupyter_resource_usage.config import ResourceUseDisplay

LIMIT = 1000
MemoryInfoWithPss = namedtuple("MemoryInfoWithPss", ["rss", "pss"])
MemoryInfoWithoutPss = namedtuple("MemoryInfoWithoutPss", ["rss"])


def get_metrics(memory_info, threshold=0.2):
    """Run the handler against one process using the given memory."""
    process = MagicMock()
    process.children.return_value = []
    process.memory_full_info.return_value = memory_info
    config = ResourceUseDisplay(
        mem_limit=LIMIT,
        mem_warning_threshold=threshold,
        track_cpu_percent=False,
        track_disk_usage=False,
    )
    written = []
    handler = SimpleNamespace(
        settings={"jupyter_resource_usage_display_config": config},
        write=written.append,
    )
    with patch("jupyter_resource_usage.api.psutil.Process", return_value=process):
        # the underlying coroutine, without the authentication check
        asyncio.run(ApiHandler.get.__wrapped__(handler))
    return json.loads(written[0])


@pytest.mark.parametrize(
    "rss, pss, warn",
    [
        # shared pages inflate the RSS of forked workers, but the PSS is what is shown
        (950, 500, False),
        (500, 950, True),
        (500, 500, False),
    ],
)
def test_warning_uses_pss_when_available(rss, pss, warn):
    metrics = get_metrics(MemoryInfoWithPss(rss=rss, pss=pss))
    assert metrics["limits"]["memory"]["warn"] is warn


@pytest.mark.parametrize("rss, warn", [(500, False), (950, True)])
def test_warning_falls_back_to_rss(rss, warn):
    metrics = get_metrics(MemoryInfoWithoutPss(rss=rss))
    assert "pss" not in metrics
    assert metrics["limits"]["memory"]["warn"] is warn


def test_warning_threshold_is_respected():
    memory_info = MemoryInfoWithPss(rss=900, pss=700)
    assert (get_metrics(memory_info, threshold=0.2))["limits"]["memory"][
        "warn"
    ] is False
    assert (get_metrics(memory_info, threshold=0.4))["limits"]["memory"]["warn"] is True
