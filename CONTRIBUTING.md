# Contributing

Contributions to jupyter-resource-usage are highly welcome! As a [Jupyter](https://jupyter.org) project,
you can follow the [Jupyter contributor guide](https://docs.jupyter.org/en/latest/contributing/content-contributor.html).

Make sure to also follow [Project Jupyter's Code of Conduct](https://github.com/jupyter/governance/blob/master/conduct/code_of_conduct.md)
for a friendly and welcoming collaborative environment.

## Setting up a development environment

We recommend using [pipenv](https://docs.pipenv.org/) to make development easier.

Alternatively, you can also use `conda` or `mamba` to create new virtual environments.

Clone the git repository:

```bash
git clone https://github.com/jupyter-server/jupyter-resource-usage
```

Create an environment that will hold our dependencies:

```bash
cd jupyter-resource-usage
pipenv --python 3.6
```

With conda:

```bash
conda create -n jupyter-resource-usage -c conda-forge python
```

Activate the virtual environment that pipenv created for us

```bash
pipenv shell
```

With conda:

```bash
conda activate jupyter-resource-usage
```

Do a dev install of jupyter-resource-usage and its dependencies

```bash
pip install --editable .[dev]
```

Enable the server extension:

```bash
jupyter serverextension enable --py jupyter_resource_usage  --sys-prefix
```

_Note: if you're using Jupyter Server:_

```bash
jupyter server extension enable --py jupyter_resource_usage  --sys-prefix
```

## Classic notebook extension

Install and enable the nbextension for use with Jupyter Classic Notebook.

```bash
jupyter nbextension install --py jupyter_resource_usage --symlink --sys-prefix
jupyter nbextension enable --py jupyter_resource_usage --sys-prefix
```

Start a Jupyter Notebook instance, open a new notebook and check out the memory usage in the top right!

```bash
jupyter notebook
```

If you want to test the memory limit display functionality, you can do so by setting the `MEM_LIMIT` environment variable (in bytes) when starting `jupyter notebook`.

```bash
MEM_LIMIT=$(expr 128 \* 1024 \* 1024) jupyter notebook
```

## JupyterLab extension

The JupyterLab extension for `jupyter-resource-usage` was bootstrapped from the [extension cookiecutter](https://github.com/jupyterlab/extension-cookiecutter-ts), and follows the common patterns and tooling for developing extensions.

```bash
# activate the environment (conda, pipenv)

# install the package in development mode
python -m pip install -e ".[dev]"

# link your development version of the extension with JupyterLab
jupyter labextension develop . --overwrite

# go to the labextension directory
cd packages/labextension/

# Rebuild extension Typescript source after making changes
jlpm run build
```

You can watch the source directory and run JupyterLab at the same time in different terminals to watch for changes in the extension's source and automatically rebuild the extension.

```bash
# Watch the source directory in one terminal, automatically rebuilding when needed
jlpm run watch
# Run JupyterLab in another terminal
jupyter lab
```

With the watch command running, every saved change will immediately be built locally and available in your running JupyterLab. Refresh JupyterLab to load the change in your browser (you may need to wait several seconds for the extension to be rebuilt).

To check the extension is correctly installed, run:

```bash
jupyter labextension list
```

It should show something like the following:

```bash
JupyterLab v3.0.0
/path/to/env/share/jupyter/labextensions
        jupyter-resource-usage v0.1.0 enabled OK
```

## pre-commit

`jupyter-resource-usage` has adopted automatic code formatting so you shouldn't need to worry too much about your code style.
As long as your code is valid,
the pre-commit hook should take care of how it should look. Here is how to set up pre-commit hooks for automatic code formatting, etc.

```bash
pre-commit install
```

You can also invoke the pre-commit hook manually at any time with

```bash
pre-commit run
```

which should run any autoformatting on your code
and tell you about any errors it couldn't fix automatically.
You may also install [black integration](https://github.com/ambv/black#editor-integration)
into your text editor to format code automatically.

If you have already committed files before setting up the pre-commit
hook with `pre-commit install`, you can fix everything up using
`pre-commit run --all-files`. You need to make the fixing commit
yourself after that.

## Tests

It's a good idea to write tests to exercise any new features,
or that trigger any bugs that you have fixed to catch regressions. `pytest` is used to run the test suite. You can run the tests with in the repo directory:

```bash
python -m pytest -vvv jupyter_resource_usage
```
