from typing import NamedTuple, Optional

try:
    import psutil
except ImportError:
    psutil = None


class MemoryMetrics(NamedTuple):
    current_memory: int
    max_memory: int


class CPUMetrics(NamedTuple):
    cpu_max: float
    cpu_usage: float


def memory_metrics() -> Optional[MemoryMetrics]:
    if psutil:
        cur_process = psutil.Process()
        all_processes = [cur_process] + cur_process.children(recursive=True)

        rss = sum([p.memory_info().rss for p in all_processes])
        virtual_memory = psutil.virtual_memory().total

    else:
        return None

    return MemoryMetrics(rss, virtual_memory)


def cpu_metrics() -> Optional[CPUMetrics]:
    if psutil:
        cur_process = psutil.Process()
        all_processes = [cur_process] + cur_process.children(recursive=True)

        cpu_count = psutil.cpu_count()

        def get_cpu_percent(p):
            try:
                return p.cpu_percent(interval=0.05)
            # Avoid littering logs with stack traces complaining
            # about dead processes having no CPU usage
            except BaseException:
                return 0

        cpu_percent = sum([get_cpu_percent(p) for p in all_processes])

    else:
        return None

    return CPUMetrics(cpu_count * 100.0, cpu_percent)
