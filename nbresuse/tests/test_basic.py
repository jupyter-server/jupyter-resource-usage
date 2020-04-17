from mock import MagicMock
from mock import patch


class TestBasic:
    """Some basic tests, checking import, making sure APIs remain consistent, etc"""

    def test_import_serverextension(self):
        """Check that serverextension hooks are available"""
        from nbresuse import (
            _jupyter_server_extension_paths,
            _jupyter_nbextension_paths,
            load_jupyter_server_extension,
        )

        assert _jupyter_server_extension_paths() == [{"module": "nbresuse"}]
        assert _jupyter_nbextension_paths() == [
            {
                "section": "notebook",
                "dest": "nbresuse",
                "src": "static",
                "require": "nbresuse/main",
            }
        ]

        # mock a notebook app
        nbapp_mock = MagicMock()
        nbapp_mock.web_app.settings = {}

        # mock these out for unit test
        with patch("tornado.ioloop.PeriodicCallback") as periodic_callback_mock, patch(
            "nbresuse.ResourceUseDisplay"
        ) as resource_use_display_mock, patch(
            "nbresuse.PrometheusHandler"
        ) as prometheus_handler_mock:

            # load up with mock
            load_jupyter_server_extension(nbapp_mock)

            # assert that we installed the application in settings
            print(nbapp_mock.web_app.settings)
            assert "nbresuse_display_config" in nbapp_mock.web_app.settings

            # assert that we instantiated a periodic callback with the fake
            # prometheus
            assert periodic_callback_mock.return_value.start.call_count == 1
            assert prometheus_handler_mock.call_count == 1
            prometheus_handler_mock.assert_called_with(nbapp_mock)
