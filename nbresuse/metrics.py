from typing import NamedTuple
from typing import Optional

try:
    import psutil
except ImportError:
    psutil = None


class MemoryMetrics(NamedTuple):
    rss: int
    virtual_memory: int


class CPUMetrics(NamedTuple):
    cpu_percent: float
    cpu_count: int


def per_process_metric(metric_name, metric_kwargs={}, metric_attribute=None):
    if psutil is None:
        return None
    else:
        current_process = psutil.Process()
        all_processes = [current_process] + current_process.children(recursive=True)

        def get_per_process_metric(
            process, metric_name, metric_kwargs, metric_attribute=None
        ):
            try:
                metric_value = getattr(process, metric_name)(**metric_kwargs)
                if metric_attribute is not None:
                    return getattr(metric_value, metric_attribute)
                return metric_value
            # Avoid littering logs with stack traces
            # complaining about dead processes
            except BaseException:
                return 0

        per_process_metric_value = lambda process: get_per_process_metric(
            process, metric_name, metric_kwargs, metric_attribute
        )

        return sum([per_process_metric_value(process) for process in all_processes])


def system_metric(metric_name, metric_kwargs={}, metric_attribute=None):
    if psutil is None:
        return None
    else:
        metric_value = getattr(psutil, metric_name)(**metric_kwargs)
        if metric_attribute is not None:
            return getattr(metric_value, metric_attribute)
        return metric_attribute


def memory_metrics() -> Optional[MemoryMetrics]:

    rss = {"metric_name": "memory_info", "metric_attribute": "rss"}
    rss_value = per_process_metric(**rss)

    virtual_memory = {"metric_name": "virtual_memory", "metric_attribute": "total"}
    virtual_memory_value = system_metric(**virtual_memory)

    memory_metric_values = {"rss": rss_value, "virtual_memory": virtual_memory_value}

    if any(value is None for value in memory_metric_values.values()):
        return None

    return MemoryMetrics(**memory_metric_values)


def cpu_metrics() -> Optional[CPUMetrics]:

    cpu_percent = {"metric_name": "cpu_percent", "metric_kwargs": {"interval": 0.05}}
    cpu_percent_value = per_process_metric(**cpu_percent)

    cpu_count = {"metric_name": "cpu_count"}
    cpu_count_value = system_metric(**cpu_count)

    cpu_metric_values = {"cpu_percent": cpu_percent_value, "cpu_count": cpu_count_value}

    if any(value is None for value in cpu_metric_values.values()):
        return None

    return CPUMetrics(**cpu_metric_values)
