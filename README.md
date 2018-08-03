# nbresuse

![Screenshot with memory limit](screenshot.png)

NB Resource Usage (nbresuse) is a small extension for Jupyter Notebooks that
displays an indication of how much resources your current notebook server and
its children (kernels, terminals, etc) are using. This is displayed in the
main toolbar in the notebook itself, refreshing every 5s.

## Installation

You can currently install this package from PyPI.

```bash
pip install nbresuse
```

**If your notebook version is < 5.3**, you need to enable the extension manually.

```
jupyter serverextension enable --py nbresuse --sys-prefix
jupyter nbextension install --py nbresuse --sys-prefix
jupyter nbextension enable --py nbresuse --sys-prefix
```

## Configuration

### Memory Limit

`nbresuse` can display a memory limit (but not enforce it). You can set this
in serveral ways:

1. `MEM_LIMIT` environment variable. This is set by [JupyterHub](http://github.com/jupyterhub/jupyterhub/)
   if using a spawner that supports it.
2. In the commandline when starting `jupyter notebook`, as `--ResourceUseDisplay.mem_limit`.
3. In your jupyter notebook [traitlets](https://traitlets.readthedocs.io/en/stable/) config file

The limit needs to be set as an integer in Bytes.

### Memory usage warning threshold

![Screenshot with memory warning](warn-screenshot.png)

The background of the resource display can be changed to red when the user is near a memory limit.
The threshold for this warning can be configured as a fraction of the memory limit.

If you want to flash the warning to the user when they are within 10% of the memory limit, you
can set the parameter `--ResourceUseDisplay.mem_warning_threshold=0.1`.

## Resources displayed

Currently it only displays Memory usage (just RSS). Other metrics will be
added in the future as needed.