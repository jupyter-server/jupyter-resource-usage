import asyncio
import threading
import time
from types import SimpleNamespace

from mock import MagicMock
from mock import patch

from jupyter_resource_usage.prometheus import PrometheusHandler


def make_handler(cpu_metrics):
    metricsloader = MagicMock()
    metricsloader.config = SimpleNamespace(
        track_cpu_percent=True,
        track_disk_usage=False,
        mem_limit=0,
        cpu_limit=0.0,
    )
    metricsloader.memory_metrics.return_value = None
    metricsloader.cpu_metrics = cpu_metrics

    # Gauges register in the global prometheus registry, so mock them to be
    # able to create several handlers in one process.
    with patch(
        "jupyter_resource_usage.prometheus.Gauge", lambda *args, **kwargs: MagicMock()
    ):
        return PrometheusHandler(metricsloader)


def test_cpu_sampling_does_not_block_event_loop():
    """The (slow) CPU sampler must run off the event loop thread"""
    sampler_threads = []

    def slow_cpu_metrics():
        sampler_threads.append(threading.current_thread())
        time.sleep(0.5)
        return {"cpu_percent": 42.0, "cpu_count": 4}

    handler = make_handler(slow_cpu_metrics)

    async def run():
        ticks = 0
        stop = asyncio.Event()

        async def ticker():
            nonlocal ticks
            while not stop.is_set():
                await asyncio.sleep(0.01)
                ticks += 1

        ticker_task = asyncio.create_task(ticker())
        await handler()
        stop.set()
        await ticker_task
        return ticks

    ticks = asyncio.run(run())

    assert len(sampler_threads) == 1
    assert sampler_threads[0] is not threading.main_thread()
    # A blocked loop would have allowed (almost) no ticks during the 0.5 s
    # sample; allow plenty of slack for slow runners.
    assert ticks >= 5

    handler.TOTAL_CPU_USAGE.set.assert_called_once_with(42.0)
    handler.MAX_CPU_USAGE.set.assert_called_once_with(400.0)
