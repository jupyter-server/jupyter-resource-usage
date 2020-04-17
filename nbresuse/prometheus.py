from notebook.notebookapp import NotebookApp
from prometheus_client import Gauge
from tornado import gen
from typing import Optional

from nbresuse.metrics import cpu_metrics
from nbresuse.metrics import CPUMetrics
from nbresuse.metrics import memory_metrics
from nbresuse.metrics import MemoryMetrics

try:
    # Traitlets >= 4.3.3
    from traitlets import Callable
except ImportError:
    from .utils import Callable

TOTAL_MEMORY_USAGE = Gauge("total_memory_usage", "counter for total memory usage", [])

MAX_MEMORY_USAGE = Gauge("max_memory_usage", "counter for max memory usage", [])

TOTAL_CPU_USAGE = Gauge("total_cpu_usage", "counter for total cpu usage", [])

MAX_CPU_USAGE = Gauge("max_cpu_usage", "counter for max cpu usage", [])


class PrometheusHandler(Callable):
    def __init__(self, nbapp: NotebookApp):
        super().__init__()
        self.config = nbapp.web_app.settings["nbresuse_display_config"]
        self.session_manager = nbapp.session_manager

    @gen.coroutine
    def __call__(self, *args, **kwargs):
        metrics = self.apply_memory_limits(memory_metrics())
        if metrics is not None:
            TOTAL_MEMORY_USAGE.set(metrics.current_memory)
            MAX_MEMORY_USAGE.set(metrics.max_memory)
        if self.config.track_cpu_percent:
            metrics = self.apply_cpu_limits(cpu_metrics())
            if metrics is not None:
                TOTAL_CPU_USAGE.set(metrics.cpu_usage)
                MAX_CPU_USAGE.set(metrics.cpu_max)

    def apply_memory_limits(self, metrics: Optional[MemoryMetrics]) -> Optional[MemoryMetrics]:
        if metrics is not None:
            if callable(self.config.mem_limit):
                metrics.max_memory = self.config.mem_limit(rss=metrics.max_memory)
            elif self.config.mem_limit > 0:  # mem_limit is an Int
                metrics.max_memory = self.config.mem_limit
        return metrics

    def apply_cpu_limits(self, metrics: Optional[CPUMetrics]) -> Optional[CPUMetrics]:
        if metrics is not None:
            if self.config.cpu_limit > 0:
                metrics.cpu_max = self.config.cpu_limit
        return metrics
