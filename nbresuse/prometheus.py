from typing import Optional

from tornado import gen
from notebook.utils import maybe_future
from prometheus_client import Gauge
from psutil import process_iter, AccessDenied, NoSuchProcess

from nbresuse.metrics import PSUtilMetricsLoader

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
        self.session_manager = metricsloader.nbapp.session_manager
        self.kernel_spec_manager = metricsloader.nbapp.kernel_spec_manager

        gauge_names = ["total_memory", "max_memory", "total_cpu", "max_cpu", "kernel_memory"]
        for name in gauge_names:
            phrase = name + "_usage"
            if name is "kernel_memory":
                label = ['kernel_id']
            else:
                label = []
            gauge = Gauge(phrase, "counter for " + phrase.replace("_", " "), label)
            setattr(self, phrase.upper(), gauge)
            
    @gen.coroutine
    def __call__(self, *args, **kwargs):
        yield self.kernel_metrics()
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
            
    @gen.coroutine
    def kernel_metrics(self):
        kernels = yield maybe_future(self._list_kernel_memory())
        for kernel_id, data in kernels.items():
            self.KERNEL_MEMORY_USAGE.labels(kernel_id=kernel_id).set(data['rss'])

    @gen.coroutine
    def _list_kernel_memory(self):
        kernel_memory = dict()

        session_manager = self.session_manager
        sessions = yield maybe_future(session_manager.list_sessions())
        kernel_processes = PrometheusHandler._kernel_processes(self.kernel_spec_manager.get_all_specs())

        def find_process(kernel_id):
            for proc in kernel_processes:
                cmd = proc.cmdline()
                if cmd:
                    last_arg = cmd[-1]
                    if session_id in last_arg:
                        return proc
            return None

        for session in sessions:
            kernel = session['kernel']
            kernel_id = kernel['id']
            kernel_process = find_process(kernel_id)
            if kernel_process:
                kernel_memory[kernel_id] = kernel_process.memory_info()._asdict()

        raise gen.Return(kernel_memory)

    @staticmethod
    def _kernel_processes(kernel_specs):
        for proc in process_iter():
            try:
                for specs in kernel_specs.values():
                    for spec in specs.values():
                        if 'argv' in spec:
                            key = " ".join(spec.get('argv')[:-1])
                            if key in " ".join(proc.cmdline()):
                                yield proc
            except (AccessDenied, NoSuchProcess, OSError):
                pass
