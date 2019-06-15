from nbresuse.hooks import hookimpl
import psutil
import os


@hookimpl
def nbresuse_add_resource(config):
    cur_process = psutil.Process()
    all_processes = [cur_process] + cur_process.children(recursive=True)
    rss = sum([p.memory_info().rss for p in all_processes])

    limits = {}

    if config.mem_limit != 0:
        limits['memory'] = {
            'rss': config.mem_limit
        }
        if config.mem_warning_threshold != 0:
            limits['memory']['warn'] = (config.mem_limit - rss) < (config.mem_limit * config.mem_warning_threshold)

    return {
        'nbresuse.jupyter.org/memory': {
            'notebook': {
                'rss': {
                    'usage': rss,
                    # JupyterHub might set MEM_LIMIT - if not, assume
                    # we have all the RAM in the system
                    'limit': os.environ.get('MEM_LIMIT', psutil.virtual_memory().available),
                    'warn': config.mem_warning_threshold
                }
            },
        },
    }
