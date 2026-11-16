import asyncio
import json
import multiprocessing
import time

import psutil
import pytest
from traitlets.config import Config

from jupyter_resource_usage.api import ApiHandler


def burn_cpu(started, seconds, period=0.1, duty=0.25):
    """Use a quarter of a core in short bursts, the way a mostly idle kernel does."""
    started.set()
    deadline = time.monotonic() + seconds
    while time.monotonic() < deadline:
        burst_end = time.monotonic() + period * duty
        while time.monotonic() < burst_end:
            pass
        time.sleep(period * (1 - duty))


def recycled(pid):
    """The cache entry a process leaves behind when its PID gets taken over.

    psutil tells processes apart by ``(pid, create_time)`` and remembers the CPU
    times read by the previous ``cpu_percent()`` call, so an entry left over by
    a dead process would measure its successor against times it never spent.

    This sets the private ``_ident`` and ``_last_proc_cpu_times`` attributes of
    psutil, so a psutil release that changes them can fail this test without a
    fault in the handler.
    """
    stale = psutil.Process(pid)
    stale.cpu_percent()
    # as if the PID had belonged to an older process; psutil 8 takes a creation
    # time of 0 as unknown, and an unknown time compares equal to any other
    stale._ident = (pid, 1.0)
    times = stale._last_proc_cpu_times
    stale._last_proc_cpu_times = times._replace(user=times.user + 3600)
    return stale


async def get_metrics(jp_fetch):
    return json.loads((await jp_fetch("api", "metrics", "v1")).body)


@pytest.fixture
def jp_server_config():
    return Config(
        {
            "ServerApp": {"jpserver_extensions": {"jupyter_resource_usage": True}},
            "ResourceUseDisplay": {
                "track_cpu_percent": True,
                # the Prometheus callback samples with a blocking interval,
                # which would hold up the event loop while a request is served
                "enable_prometheus_metrics": False,
            },
        }
    )


@pytest.fixture(autouse=True)
def reset_handler_state():
    """The psutil state lives on the class and is shared by all requests."""
    ApiHandler._cached_processes = {}
    ApiHandler._cpu_sample = None
    yield
    ApiHandler._cached_processes = {}
    ApiHandler._cpu_sample = None


@pytest.fixture
def busy_child():
    """A child process of the test runner spending a steady share of a core."""
    # spawn rather than fork: the handler's thread pool is already running
    context = multiprocessing.get_context("spawn")
    started = context.Event()
    child = context.Process(target=burn_cpu, args=(started, 30), daemon=True)
    child.start()
    assert started.wait(timeout=30), "the busy child process never started"
    try:
        yield child
    finally:
        child.terminate()
        child.join()


async def test_cpu_percent_is_reported(jp_fetch, busy_child):
    """CPU usage has to be measured across requests, not within one.

    https://github.com/jupyter-server/jupyter-resource-usage/issues/254
    """
    await get_metrics(jp_fetch)  # the first request only establishes the baseline
    await asyncio.sleep(1)
    metrics = await get_metrics(jp_fetch)
    assert metrics["cpu_percent"] > 0


async def test_cpu_percent_is_reported_to_concurrent_clients(
    jp_fetch, busy_child, monkeypatch
):
    """The status bar item, the top bar item and every browser tab poll on their own."""
    await get_metrics(jp_fetch)
    await asyncio.sleep(1)
    # A slow runner can take longer than the default interval to get to the
    # second request, so widen the interval. The baseline reading would then
    # be served to both requests, so drop it.
    monkeypatch.setattr(ApiHandler, "min_cpu_sample_interval", 60, raising=False)
    ApiHandler._cpu_sample = None
    first, second = await asyncio.gather(get_metrics(jp_fetch), get_metrics(jp_fetch))
    assert first["cpu_percent"] > 0
    # whichever request arrives second must not measure over the few
    # milliseconds since the first one, which reads as 0 or as a huge spike
    assert second["cpu_percent"] == first["cpu_percent"]


async def test_cpu_percent_ignores_a_recycled_pid(jp_fetch, busy_child):
    """A kernel can exit and leave its PID to be picked up by the next process."""
    await get_metrics(jp_fetch)
    ApiHandler._cached_processes[busy_child.pid] = recycled(busy_child.pid)
    await asyncio.sleep(1)
    metrics = await get_metrics(jp_fetch)
    assert metrics["cpu_percent"] >= 0
