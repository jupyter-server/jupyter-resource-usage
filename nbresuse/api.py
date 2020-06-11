import json

from notebook.base.handlers import IPythonHandler
from tornado import web

try:
    # since psutil is an optional dependency
    import psutil
except ImportError:
    psutil = None

try:
    # Traitlets >= 4.3.3
    from traitlets import Callable
except ImportError:
    from .utils import Callable


class ApiHandler(IPythonHandler):

    @web.authenticated
    async def get(self):
        """
        Calculate and return current resource usage metrics
        """
        config = self.settings['nbresuse_display_config']

        if psutil:
            cur_process = psutil.Process()
            all_processes = [cur_process] + cur_process.children(recursive=True)

            # Get memory information
            rss = sum([p.memory_info().rss for p in all_processes])

            if callable(config.mem_limit):
                mem_limit = config.mem_limit(rss=rss)
            else:  # mem_limit is an Int
                mem_limit = config.mem_limit

            limits = {'memory': {
                'rss': mem_limit
            }}
            if config.mem_limit:
                limits['memory']['warn'] = (mem_limit - rss) < (
                        mem_limit * config.mem_warning_threshold)

            metrics = {
                'rss': rss,
                'limits': limits,
            }

            self.write(json.dumps(metrics))