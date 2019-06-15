from nbresuse.hooks import hookimpl
import psutil
import os
from traitlets.config import Configurable
from traitlets import Float, List


class ResourceUseDisplay(Configurable):
    """
    Holds server-side configuration for nbresuse
    """

    mem_warning_threshold = Float(
        0.9,
        help="""
        Warn user with flashing lights when memory usage is
        more than this fraction of memory limit.

        For example, if memory limit is 128MB,
        `mem_warning_threshold` is 0.9,
        we will start warning the user when they use
        (128 * 0.9) MB.

        Set to 0 to disable warning.
        """,
        config=True
    )


# NOTE: This hits /proc so many times it is gonna make *someone* mad
# FIXME: Cache this!
@hookimpl
def nbresuse_add_resource(nbapp):
    cur_process = psutil.Process()
    all_processes = [cur_process] + cur_process.children(recursive=True)

    config = ResourceUseDisplay(parent=nbapp)
    rss = sum([p.memory_info().rss for p in all_processes])

    return {
        'nbresuse.jupyter.org/usage': {
            'rss':{
                'usage': rss,
                'limit': os.environ.get('MEM_LIMIT', None),
                'warn': config.mem_warning_threshold
            }
        }
    }
