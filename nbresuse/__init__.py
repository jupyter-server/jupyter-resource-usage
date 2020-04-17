import os

from tornado import ioloop
from traitlets import Bool
from traitlets import default
from traitlets import Float
from traitlets import Int
from traitlets import Union
from traitlets.config import Configurable

from nbresuse.prometheus import PrometheusHandler

try:
    # Traitlets >= 4.3.3
    from traitlets import Callable
except ImportError:
    from .utils import Callable


def _jupyter_server_extension_paths():
    """
    Set up the server extension for collecting metrics
    """
    return [{"module": "nbresuse"}]


def _jupyter_nbextension_paths():
    """
    Set up the notebook extension for displaying metrics
    """
    return [
        {
            "section": "notebook",
            "dest": "nbresuse",
            "src": "static",
            "require": "nbresuse/main",
        }
    ]


class ResourceUseDisplay(Configurable):
    """
    Holds server-side configuration for nbresuse
    """

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

    cpu_limit = Float(
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


def load_jupyter_server_extension(nbapp):
    """
    Called during notebook start
    """
    resuseconfig = ResourceUseDisplay(parent=nbapp)
    nbapp.web_app.settings["nbresuse_display_config"] = resuseconfig
    callback = ioloop.PeriodicCallback(PrometheusHandler(nbapp), 1000)
    callback.start()
