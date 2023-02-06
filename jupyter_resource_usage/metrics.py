try:
    import psutil
except ImportError:
    psutil = None

from jupyter_server.serverapp import ServerApp


class PSUtilMetricsLoader:
    def __init__(self, server_app: ServerApp):
        self.config = server_app.web_app.settings[
            "jupyter_resource_usage_display_config"
        ]
        self.server_app = server_app

    def get_process_metric_value(self, process, name, kwargs, attribute=None):
        try:
            # psutil.Process methods will either return...
            metric_value = getattr(process, name)(**kwargs)
            if attribute is not None:  # ... a named tuple
                return getattr(metric_value, attribute)
            else:  # ... or a number
                return metric_value
        # Avoid littering logs with stack traces
        # complaining about dead processes
        except BaseException:
            return 0

    def process_metric(self, name, kwargs={}, attribute=None):
        if psutil is None:
            return None
        else:
            current_process = psutil.Process()
            all_processes = [current_process] + current_process.children(recursive=True)

            process_metric_value = lambda process: self.get_process_metric_value(
                process, name, kwargs, attribute
            )

            return sum([process_metric_value(process) for process in all_processes])

    def system_metric(self, name, kwargs={}, attribute=None):
        if psutil is None:
            return None
        else:
            # psutil functions will either return...
            metric_value = getattr(psutil, name)(**kwargs)
            if attribute is not None:  # ... a named tuple
                return getattr(metric_value, attribute)
            else:  # ... or a number
                return metric_value

    def get_metric_values(self, metrics, metric_type):
        metric_types = {"process": self.process_metric, "system": self.system_metric}
        metric_value = metric_types[metric_type]  # Switch statement

        metric_values = {}
        for metric in metrics:
            name = metric["name"]
            if metric.get("attribute", False):
                name += "_" + metric.get("attribute")
            metric_values.update({name: metric_value(**metric)})
        return metric_values

    def metrics(self, process_metrics, system_metrics):
        metric_values = self.get_metric_values(process_metrics, "process")
        metric_values.update(self.get_metric_values(system_metrics, "system"))

        if any(value is None for value in metric_values.values()):
            return None

        return metric_values

    def memory_metrics(self):
        return self.metrics(
            self.config.process_memory_metrics, self.config.system_memory_metrics
        )

    def cpu_metrics(self):
        return self.metrics(
            self.config.process_cpu_metrics, self.config.system_cpu_metrics
        )
