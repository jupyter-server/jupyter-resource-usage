import json
from concurrent.futures import ThreadPoolExecutor

import psutil
from notebook.base.handlers import IPythonHandler
from tornado import web
from tornado.concurrent import run_on_executor
import os

try:
    # Traitlets >= 4.3.3
    from traitlets import Callable
except ImportError:
    from .utils import Callable


class ApiHandler(IPythonHandler):

    executor = ThreadPoolExecutor(max_workers=5)

    @web.authenticated
    async def get(self):
        """
        Calculate and return current resource usage metrics
        """
        config = self.settings["nbresuse_display_config"]

        cur_process = psutil.Process()
        all_processes = [cur_process] + cur_process.children(recursive=True)

        # Get memory information
        # If running in a docker container or pod
        dockerized = self.__if_dockerized()
        if not dockerized:
            # if running on physical server
            rss = sum([p.memory_info().rss for p in all_processes])
            if callable(config.mem_limit):
                mem_limit = config.mem_limit(rss=rss)
            else:  # mem_limit is an Int
                mem_limit = config.mem_limit
            # unused rss, use system avail memory instead
        else:
            # if running in docker container or pod
            mem_limit = self.__get_docker_physical_memory()
            real_rss = self.__get_docker_real_rss_memory()
            rss = real_rss

        limits = {"memory": {"rss": mem_limit}}
        if config.mem_limit:
            limits["memory"]["warn"] = (mem_limit - rss) < (
                    mem_limit * config.mem_warning_threshold
            )

        metrics = {"rss": rss, "limits": limits}

        # Optionally get CPU information
        if config.track_cpu_percent:
            if not dockerized:
                # original nbresuse
                cpu_count = psutil.cpu_count()
                cpu_percent = await self._get_cpu_percent(all_processes)
            else:
                # for docker use only
                cpu_count = int(open('/sys/fs/cgroup/cpu/cpu.cfs_quota_us').read().strip()) / 100000
                cpu_percent = await self._get_cpu_percent(all_processes) / cpu_count

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

    @staticmethod
    def __get_docker_physical_memory():
        with open('/sys/fs/cgroup/memory/memory.limit_in_bytes') as limit:
            mem_limit = int(limit.read().strip())
        return mem_limit

    @staticmethod
    def __get_docker_memory_usage():
        with open('/sys/fs/cgroup/memory/memory.usage_in_bytes') as usage:
            all_used = int(usage.read().strip())
        return all_used

    @staticmethod
    def __get_docker_real_rss_memory():
        real_rss = 0
        with open('/sys/fs/cgroup/memory/memory.stat') as stats:
            for line in stats.readlines():
                stat = line.split()
                if stat[0] in ['rss', 'inactive_file', 'active_file']:
                    real_rss = real_rss + int(stat[1])
        return real_rss

    @staticmethod
    def __if_dockerized():
        if os.path.exists('/.dockerenv'):
            # running in docker or pod
            return True
        else:
            # running on physical server
            return False

