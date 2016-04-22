# nbresuse

![Screenshot](screenshot.png)

NB Resource Usage (nbresuse) is a small extension for Jupyter Notebooks that
displays an indication of how much resources your current notebook server and
its children (kernels, terminals, etc) are using. This is displayed in the
main toolbar in the notebook itself, refreshing every 5s.

## Installation

You can currently install this directly from git:

```
pip install git+https://github.com/yuvipanda/nbresuse.git
jupyter serverextension install --py nbresuse
jupyter nbextension install --py nbresuse
```

To enable this extension for all notebooks:

```
jupyter nbextension enable --py nbresuse
```

## Resources displayed

Currently it only displays Memory usage (just RSS). Other metrics will be
added in the future as needed.
