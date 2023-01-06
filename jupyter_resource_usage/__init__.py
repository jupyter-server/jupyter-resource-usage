from pathlib import Path

from ._version import __version__
from .server_extension import load_jupyter_server_extension


def _jupyter_labextension_paths():
    return [{"src": "labextension", "dest": "@jupyter-server/resource-usage"}]


def _jupyter_server_extension_points():
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


# For backward compatibility
_load_jupyter_server_extension = load_jupyter_server_extension
_jupyter_server_extension_paths = _jupyter_server_extension_points
