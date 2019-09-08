import os
import json
import psutil
from traitlets import Bool, Float, Int, Union, default
from traitlets.config import Configurable
from notebook.utils import url_path_join
from notebook.base.handlers import IPythonHandler
from tornado import web

try:
    # Traitlets >= 4.3.3
    from traitlets import Callable
except ImportError:
    from .utils import Callable

from concurrent.futures import ThreadPoolExecutor
from tornado.concurrent import run_on_executor

class MetricsHandler(IPythonHandler):
    def initialize(self):
        super().initialize()
        self.cpu_percent = 0
        
        # https://www.tornadoweb.org/en/stable/concurrent.html#tornado.concurrent.run_on_executor
        self.executor = ThreadPoolExecutor(max_workers=10)

        self.cpu_count = psutil.cpu_count()

    @run_on_executor
    def update_cpu_percent(self, all_processes):

        def get_cpu_percent(p):
            try:
                return p.cpu_percent(interval=0.05)
            # Avoid littering logs with stack traces complaining
            # about dead processes having no CPU usage
            except:
                return 0

        return sum([get_cpu_percent(p) for p in all_processes])

    @web.authenticated
    async def get(self):
        """
        Calculate and return current resource usage metrics
        """
        config = self.settings['nbresuse_display_config']
        cur_process = psutil.Process()
        all_processes = [cur_process] + cur_process.children(recursive=True)     
        limits = {}

        # Get memory information
        rss = sum([p.memory_info().rss for p in all_processes])

        if callable(config.mem_limit):
            mem_limit = config.mem_limit(rss=rss)
        else: # mem_limit is an Int
            mem_limit = config.mem_limit

        # A better approach would use cpu_affinity to account for the
        # fact that the number of logical CPUs in the system is not
        # necessarily the same as the number of CPUs the process
        # can actually use. But cpu_affinity isn't available for OS X.
        cpu_count = psutil.cpu_count()

        if config.track_cpu_percent:
            self.cpu_percent = await self.update_cpu_percent(all_processes)

        if config.mem_limit != 0:
            limits['memory'] = {
                'rss': mem_limit
            }
            if config.mem_warning_threshold != 0:
                limits['memory']['warn'] = (mem_limit - rss) < (mem_limit * config.mem_warning_threshold)

        # Optionally get CPU information
        if config.track_cpu_percent:
            self.cpu_percent = await self.update_cpu_percent(all_processes)

            if config.cpu_limit != 0:
                limits['cpu'] = {
                    'cpu': config.cpu_limit
                }
                if config.cpu_warning_threshold != 0:
                    limits['cpu']['warn'] = (config.cpu_limit - self.cpu_percent) < (config.cpu_limit * config.cpu_warning_threshold)

        metrics = {
            'rss': rss,
            'limits': limits,
        }
        if config.track_cpu_percent:
            metrics.update(cpu_percent=self.cpu_percent,
                               cpu_count=self.cpu_count)

        self.log.debug("NBResuse metrics: %s", metrics)
        self.write(json.dumps(metrics))


def _jupyter_server_extension_paths():
    """
    Set up the server extension for collecting metrics
    """
    return [{
        'module': 'nbresuse',
    }]

def _jupyter_nbextension_paths():
    """
    Set up the notebook extension for displaying metrics
    """
    return [{
        "section": "notebook",
        "dest": "nbresuse",
        "src": "static",
        "require": "nbresuse/main"
    }]

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
        """
    ).tag(config=True)

    mem_limit = Union(
        trait_types=[Int(), Callable()],
        help="""
        Memory limit to display to the user, in bytes.
        Can also be a function which calculates the memory limit.

        Note that this does not actually limit the user's memory usage!

        Defaults to reading from the `MEM_LIMIT` environment variable. If
        set to 0, no memory limit is displayed.
        """
    ).tag(config=True)

    @default('mem_limit')
    def _mem_limit_default(self):
        return int(os.environ.get('MEM_LIMIT', 0))

    track_cpu_percent = Bool(
        default_value=False,
        help="""
        Set to True in order to enable reporting of CPU usage statistics.
        """
    ).tag(config=True)

    cpu_warning_threshold = Float(
        default_value=0.1,
        help="""
        Warn user with flashing lights when CPU usage is within this fraction
        CPU usage limit.

        For example, if CPU limit is 150%, `cpu_warning_threshold` is 0.1,
        we will start warning the user when they use (150 - (150 * 0.1)) %.

        Set to 0 to disable warning.
        """
    ).tag(config=True)

    cpu_limit = Float(
        default_value=0,
        help="""
        CPU usage limit to display to the user.

        Note that this does not actually limit the user's CPU usage!

        Defaults to reading from the `CPU_LIMIT` environment variable. If
        set to 0, no CPU usage limit is displayed.
        """
    ).tag(config=True)

    @default('cpu_limit')
    def _cpu_limit_default(self):
        return float(os.environ.get('CPU_LIMIT', 0))

def load_jupyter_server_extension(nbapp):
    """
    Called during notebook start
    """
    resuseconfig = ResourceUseDisplay(parent=nbapp)
    nbapp.web_app.settings['nbresuse_display_config'] = resuseconfig
    route_pattern = url_path_join(nbapp.web_app.settings['base_url'], '/metrics')
    nbapp.web_app.add_handlers('.*', [(route_pattern, MetricsHandler)])
