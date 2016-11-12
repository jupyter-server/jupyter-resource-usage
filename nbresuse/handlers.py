import os
import json
import psutil
from notebook.utils import url_path_join
from notebook.base.handlers import IPythonHandler

def get_metrics():
    cur_process = psutil.Process()
    all_processes = [cur_process] + cur_process.children(recursive=True)
    rss = sum([p.memory_info().rss for p in all_processes])
    return {
        'rss': rss,
        'limits': {
            'memory': int(os.environ.get('MEM_LIMIT', None))
        }
    }


class MetricsHandler(IPythonHandler):
    def get(self):
        self.finish(json.dumps(get_metrics()))


def setup_handlers(web_app):
    route_pattern = url_path_join(web_app.settings['base_url'], '/metrics')
    web_app.add_handlers('.*', [(route_pattern, MetricsHandler)])
