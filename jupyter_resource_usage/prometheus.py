from typing import Optional

from prometheus_client import Gauge

from jupyter_resource_usage.metrics import PSUtilMetricsLoader

try:
    # Traitlets >= 4.3.3
    from traitlets import Callable
except ImportError:
    from .utils import Callable


class PrometheusHandler(Callable):
    def __init__(self, metricsloader: PSUtilMetricsLoader):
        super().__init__()
        self.metricsloader = metricsloader
        self.config = metricsloader.config
        self.session_manager = metricsloader.server_app.session_manager

        gauge_names = ["total_memory", "max_memory", "total_cpu", "max_cpu"]
        for name in gauge_names:
            phrase = name + "_usage"
            gauge = Gauge(phrase, "counter for " + phrase.replace("_", " "), [])
            setattr(self, phrase.upper(), gauge)

    async def __call__(self, *args, **kwargs):
        memory_metric_values = self.metricsloader.memory_metrics()
        if memory_metric_values is not None:
            self.TOTAL_MEMORY_USAGE.set(memory_metric_values["memory_info_rss"])
            self.MAX_MEMORY_USAGE.set(self.apply_memory_limit(memory_metric_values))
        if self.config.track_cpu_percent:
            cpu_metric_values = self.metricsloader.cpu_metrics()
            if cpu_metric_values is not None:
                self.TOTAL_CPU_USAGE.set(cpu_metric_values["cpu_percent"])
                self.MAX_CPU_USAGE.set(self.apply_cpu_limit(cpu_metric_values))

    def apply_memory_limit(self, memory_metric_values) -> Optional[int]:
        if memory_metric_values is None:
            return None
        else:
            if callable(self.config.mem_limit):
                return self.config.mem_limit(
                    rss=memory_metric_values["memory_info_rss"]
                )
            elif self.config.mem_limit > 0:  # mem_limit is an Int
                return self.config.mem_limit
            else:
                return memory_metric_values["virtual_memory_total"]

    def apply_cpu_limit(self, cpu_metric_values) -> Optional[float]:
        if cpu_metric_values is None:
            return None
        else:
            if callable(self.config.cpu_limit):
                return self.config.cpu_limit(
                    cpu_percent=cpu_metric_values["cpu_percent"]
                )
            elif self.config.cpu_limit > 0.0:  # cpu_limit is a Float
                return self.config.cpu_limit
            else:
                return 100.0 * cpu_metric_values["cpu_count"]
