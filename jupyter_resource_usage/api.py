import json
from concurrent.futures import ThreadPoolExecutor

import psutil
import zmq
from jupyter_client.jsonutil import date_default
from jupyter_server.base.handlers import APIHandler
from jupyter_server.utils import url_path_join
from packaging import version
from tornado import web
from tornado.concurrent import run_on_executor

try:
    # Traitlets >= 4.3.3
    from traitlets import Callable
except ImportError:
    from .utils import Callable


try:
    import ipykernel

    USAGE_IS_SUPPORTED = version.parse("6.9.0") <= version.parse(ipykernel.__version__)
except ImportError:
    USAGE_IS_SUPPORTED = False

MAX_RETRIES = 3


class ApiHandler(APIHandler):
    executor = ThreadPoolExecutor(max_workers=5)

    @web.authenticated
    async def get(self):
        """
        Calculate and return current resource usage metrics
        """
        config = self.settings["jupyter_resource_usage_display_config"]

        cur_process = psutil.Process()
        all_processes = [cur_process] + cur_process.children(recursive=True)

        # Get memory information
        rss = 0
        pss = None
        for p in all_processes:
            try:
                info = p.memory_full_info()
                if hasattr(info, "pss"):
                    pss = (pss or 0) + info.pss
                rss += info.rss
            except (psutil.NoSuchProcess, psutil.AccessDenied) as e:
                pass

        if callable(config.mem_limit):
            mem_limit = config.mem_limit(rss=rss, pss=pss)
        else:  # mem_limit is an Int
            mem_limit = config.mem_limit

        limits = {"memory": {"rss": mem_limit, "pss": mem_limit}}
        if config.mem_limit and config.mem_warning_threshold != 0:
            limits["memory"]["warn"] = (mem_limit - rss) < (
                mem_limit * config.mem_warning_threshold
            )

        metrics = {"rss": rss, "limits": limits}
        if pss is not None:
            metrics["pss"] = pss

        # Optionally get CPU information
        if config.track_cpu_percent:
            cpu_count = psutil.cpu_count()
            cpu_percent = await self._get_cpu_percent(all_processes)

            if config.cpu_limit != 0:
                limits["cpu"] = {"cpu": config.cpu_limit}
                if config.cpu_warning_threshold != 0:
                    limits["cpu"]["warn"] = (config.cpu_limit - cpu_percent) < (
                        config.cpu_limit * config.cpu_warning_threshold
                    )

            metrics.update(cpu_percent=cpu_percent, cpu_count=cpu_count)

        self.write(json.dumps(metrics))

    @run_on_executor
    def _get_cpu_percent(self, all_processes):
        def get_cpu_percent(p):
            try:
                return p.cpu_percent(interval=0.05)
            # Avoid littering logs with stack traces complaining
            # about dead processes having no CPU usage
            except:
                return 0

        return sum([get_cpu_percent(p) for p in all_processes])


class KernelUsageHandler(APIHandler):
    @web.authenticated
    async def get(self, matched_part=None, *args, **kwargs):
        if not USAGE_IS_SUPPORTED:
            self.write(json.dumps({}))
            return

        kernel_id = matched_part
        km = self.kernel_manager
        lkm = km.pinned_superclass.get_kernel(km, kernel_id)
        session = lkm.session
        client = lkm.client()

        control_channel = client.control_channel
        usage_request = session.msg("usage_request", {})

        control_channel.send(usage_request)
        poller = zmq.Poller()
        control_socket = control_channel.socket
        poller.register(control_socket, zmq.POLLIN)
        for i in range(1, MAX_RETRIES + 1):
            timeout_ms = 1000 * i
            events = dict(poller.poll(timeout_ms))
            if not events:
                self.write(json.dumps({}))
                break
            if control_socket not in events:
                continue
            res = await client.control_channel.get_msg(timeout=0)
            self.write(json.dumps(res, default=date_default))
            break
