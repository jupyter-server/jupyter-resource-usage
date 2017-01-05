import os
import json
import psutil
from notebook.utils import url_path_join
from notebook.base.handlers import IPythonHandler

def get_metrics():
    cur_process = psutil.Process()
    all_processes = [cur_process] + cur_process.children(recursive=True)
    rss = sum([p.memory_info().rss for p in all_processes])
    mem_limit = os.environ.get('MEM_LIMIT', None)
    if mem_limit is not None:
        mem_limit = int(mem_limit)
    return {
        'rss': rss,
        'limits': {
            'memory': mem_limit
        }
    }


class MetricsHandler(IPythonHandler):
    def get(self):
        self.finish(json.dumps(get_metrics()))


def setup_handlers(web_app):
    route_pattern = url_path_join(web_app.settings['base_url'], '/metrics')
    web_app.add_handlers('.*', [(route_pattern, MetricsHandler)])
