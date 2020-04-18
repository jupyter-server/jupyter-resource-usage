from tornado import ioloop

from nbresuse.config import ResourceUseDisplay
from nbresuse.metrics import PSUtilMetricsLoader
from nbresuse.prometheus import PrometheusHandler


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


def load_jupyter_server_extension(nbapp):
    """
    Called during notebook start
    """
    resuseconfig = ResourceUseDisplay(parent=nbapp)
    nbapp.web_app.settings["nbresuse_display_config"] = resuseconfig
    callback = ioloop.PeriodicCallback(
        PrometheusHandler(PSUtilMetricsLoader(nbapp)), 1000
    )
    callback.start()
