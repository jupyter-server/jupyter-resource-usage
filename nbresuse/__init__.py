import os
import json
from notebook.utils import url_path_join
from notebook.base.handlers import IPythonHandler
from tornado import web, iostream
import asyncio
import pluggy
from nbresuse import hooks, default_resources
from collections import ChainMap


plugin_manager = pluggy.PluginManager('nbresuse')
plugin_manager.add_hookspecs(hooks)
# Register the resources nbresuse provides by default
plugin_manager.register(default_resources)


class MetricsHandler(IPythonHandler):
    def initialize(self, nbapp):
        self.set_header('content-type', 'text/event-stream')
        self.set_header('cache-control', 'no-cache')
        self.nbapp = nbapp

    @web.authenticated
    async def get(self):
        """
        Calculate and return current resource usage metrics
        """
        while True:
            metrics = {}
            for metric_response in plugin_manager.hook.nbresuse_add_resource(nbapp=self.nbapp):
                metrics.update(metric_response)
            self.write('data: {}\n\n'.format(json.dumps(metrics)))
            try:
                await self.flush()
            except iostream.StreamClosedError:
                return
            await asyncio.sleep(5)


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

def load_jupyter_server_extension(nbapp):
    """
    Called during notebook start
    """
    api_url= url_path_join(nbapp.web_app.settings['base_url'], '/api/nbresuse/v1')
    nbapp.web_app.add_handlers('.*', [
        (api_url, MetricsHandler, {'nbapp': nbapp})
    ])
