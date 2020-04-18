from typing import Optional

from notebook.notebookapp import NotebookApp
from prometheus_client import Gauge
from tornado import gen

from nbresuse.metrics import cpu_metrics
from nbresuse.metrics import CPUMetrics
from nbresuse.metrics import memory_metrics
from nbresuse.metrics import MemoryMetrics

try:
    # Traitlets >= 4.3.3
    from traitlets import Callable
except ImportError:
    from .utils import Callable


class PrometheusHandler(Callable):
    def __init__(self, nbapp: NotebookApp):
        super().__init__()
        self.config = nbapp.web_app.settings["nbresuse_display_config"]
        self.session_manager = nbapp.session_manager

        self.TOTAL_MEMORY_USAGE = Gauge(
            "total_memory_usage", "counter for total memory usage", []
        )
        self.MAX_MEMORY_USAGE = Gauge(
            "max_memory_usage", "counter for max memory usage", []
        )

        self.TOTAL_CPU_USAGE = Gauge(
            "total_cpu_usage", "counter for total cpu usage", []
        )
        self.MAX_CPU_USAGE = Gauge("max_cpu_usage", "counter for max cpu usage", [])

    @gen.coroutine
    def __call__(self, *args, **kwargs):
        memory_metric_values = memory_metrics()
        if memory_metric_values is not None:
            self.TOTAL_MEMORY_USAGE.set(memory_metric_values.rss)
            self.MAX_MEMORY_USAGE.set(self.apply_memory_limit(memory_metric_values))
        if self.config.track_cpu_percent:
            cpu_metric_values = cpu_metrics()
            if cpu_metric_values is not None:
                self.TOTAL_CPU_USAGE.set(cpu_metric_values.cpu_percent)
                self.MAX_CPU_USAGE.set(self.apply_cpu_limit(cpu_metric_values))

    def apply_memory_limit(
        self, memory_metric_values: Optional[MemoryMetrics]
    ) -> Optional[int]:
        if memory_metric_values is None:
            return None
        else:
            if callable(self.config.mem_limit):
                return self.config.mem_limit(rss=memory_metric_values.rss)
            elif self.config.mem_limit > 0:  # mem_limit is an Int
                return self.config.mem_limit
            else:
                return memory_metric_values.virtual_memory

    def apply_cpu_limit(
        self, cpu_metric_values: Optional[CPUMetrics]
    ) -> Optional[float]:
        if cpu_metric_values is None:
            return None
        else:
            if callable(self.config.cpu_limit):
                return self.config.cpu_limit(cpu_percent=cpu_metric_values.cpu_percent)
            elif self.config.cpu_limit > 0.0:  # cpu_limit is a Float
                return self.config.cpu_limit
            else:
                return 100.0 * cpu_metric_values.cpu_count
