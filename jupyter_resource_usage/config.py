import os

from traitlets import Bool
from traitlets import default
from traitlets import Dict
from traitlets import Float
from traitlets import Int
from traitlets import List
from traitlets import TraitType
from traitlets import Union
from traitlets.config import Configurable

try:
    # Traitlets >= 4.3.3
    from traitlets import Callable
except ImportError:
    from .utils import Callable


class PSUtilMetric(TraitType):
    """A trait describing the format to specify a metric from the psutil package"""

    info_text = "A dictionary specifying the function/method name, any keyword arguments, and if a named tuple is returned, which attribute of the named tuple to select"

    def validate(self, obj, value):
        if isinstance(value, dict):
            keys = list(value.keys())
            if "name" in keys:
                keys.remove("name")
                if all(key in ["kwargs", "attribute"] for key in keys):
                    return value
        self.error(obj, value)


class ResourceUseDisplay(Configurable):
    """
    Holds server-side configuration for jupyter-resource-usage
    """

    process_memory_metrics = List(
        trait=PSUtilMetric(),
        default_value=[{"name": "memory_info", "attribute": "rss"}],
    )

    system_memory_metrics = List(
        trait=PSUtilMetric(),
        default_value=[{"name": "virtual_memory", "attribute": "total"}],
    )

    process_cpu_metrics = List(
        trait=PSUtilMetric(),
        default_value=[{"name": "cpu_percent", "kwargs": {"interval": 0.05}}],
    )

    system_cpu_metrics = List(
        trait=PSUtilMetric(), default_value=[{"name": "cpu_count"}]
    )

    mem_warning_threshold = Float(
        default_value=0.1,
        help="""
        Warn user with flashing lights when memory usage is within this fraction
        memory limit.

        For example, if memory limit is 128MB, `mem_warning_threshold` is 0.1,
        we will start warning the user when they use (128 - (128 * 0.1)) MB.

        Set to 0 to disable warning.
        """,
    ).tag(config=True)

    mem_limit = Union(
        trait_types=[Int(), Callable()],
        help="""
        Memory limit to display to the user, in bytes.
        Can also be a function which calculates the memory limit.

        Note that this does not actually limit the user's memory usage!

        Defaults to reading from the `MEM_LIMIT` environment variable. If
        set to 0, the max memory available is displayed.
        """,
    ).tag(config=True)

    @default("mem_limit")
    def _mem_limit_default(self):
        return int(os.environ.get("MEM_LIMIT", 0))

    track_cpu_percent = Bool(
        default_value=False,
        help="""
        Set to True in order to enable reporting of CPU usage statistics.
        """,
    ).tag(config=True)

    cpu_warning_threshold = Float(
        default_value=0.1,
        help="""
        Warn user with flashing lights when CPU usage is within this fraction
        CPU usage limit.

        For example, if CPU limit is 150%, `cpu_warning_threshold` is 0.1,
        we will start warning the user when they use (150 - (150 * 0.1)) %.

        Set to 0 to disable warning.
        """,
    ).tag(config=True)

    cpu_limit = Union(
        trait_types=[Float(), Callable()],
        default_value=0,
        help="""
        CPU usage limit to display to the user.

        Note that this does not actually limit the user's CPU usage!

        Defaults to reading from the `CPU_LIMIT` environment variable. If
        set to 0, the total CPU count available is displayed.
        """,
    ).tag(config=True)

    @default("cpu_limit")
    def _cpu_limit_default(self):
        return float(os.environ.get("CPU_LIMIT", 0))

    enable_prometheus_metrics = Bool(
        default_value=True,
        help="""
        Set to False in order to disable reporting of Prometheus style metrics.
        """,
    ).tag(config=True)

    show_host_usage = Bool(
        default_value=True,
        help="""
        Set to True in order to show host cpu and host virtual memory info.
        """,
    ).tag(config=True)
