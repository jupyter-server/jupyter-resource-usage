import json
import os.path as osp

from notebook.utils import url_path_join
from tornado import ioloop

from jupyter_resource_usage.api import ApiHandler
from jupyter_resource_usage.config import ResourceUseDisplay
from jupyter_resource_usage.metrics import PSUtilMetricsLoader
from jupyter_resource_usage.prometheus import PrometheusHandler

HERE = osp.abspath(osp.dirname(__file__))

with open(osp.join(HERE, "labextension", "package.json")) as fid:
    data = json.load(fid)


def _jupyter_labextension_paths():
    return [{"src": "labextension", "dest": data["name"]}]


def _jupyter_server_extension_paths():
    """
    Set up the server extension for collecting metrics
    """
    return [{"module": "jupyter_resource_usage"}]


def _jupyter_nbextension_paths():
    """
    Set up the notebook extension for displaying metrics
    """
    return [
        {
            "section": "notebook",
            "dest": "jupyter_resource_usage",
            "src": "static",
            "require": "jupyter_resource_usage/main",
        }
    ]


def load_jupyter_server_extension(nbapp):
    """
    Called during notebook start
    """
    resuseconfig = ResourceUseDisplay(parent=nbapp)
    nbapp.web_app.settings["jupyter_resource_usage_display_config"] = resuseconfig
    base_url = nbapp.web_app.settings["base_url"]

    nbapp.web_app.add_handlers(
        ".*", [(url_path_join(base_url, "/api/metrics/v1"), ApiHandler)]
    )

    callback = ioloop.PeriodicCallback(
        PrometheusHandler(PSUtilMetricsLoader(nbapp)), 1000
    )
    callback.start()
