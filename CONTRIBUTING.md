# Contributing

Contributions to NBResuse are highly welcome! As a [Jupyter](https://jupyter.org) project,
you can follow the [Jupyter contributor guide](https://jupyter.readthedocs.io/en/latest/contributor/content-contributor.html).

Make sure to also follow [Project Jupyter's Code of Conduct](https://github.com/jupyter/governance/blob/master/conduct/code_of_conduct.md)
for a friendly and welcoming collaborative environment.

## Development set up

We recommend using [pipenv](https://docs.pipenv.org/) to make development easier.

1. Clone the git repository:

   ```bash
   git clone https://github.com/yuvipanda/nbresuse
   ```

2. Create an environment that will hold our dependencies.

   ```bash
   cd nbresuse
   pipenv --python 3.6
   ```

3. Activate the virtual environment that pipenv created for us

   ```bash
   pipenv shell
   ```

4. Do a dev install of nbresuse and its dependencies

   ```bash
   pip install --editable .[dev]
   ```

5. Install and enable the nbextension for use with Jupyter Classic Notebook.

   ```bash
   jupyter nbextension install --py nbresuse --symlink --sys-prefix
   jupyter serverextension enable --py nbresuse  --sys-prefix
   jupyter nbextension enable --py nbresuse --sys-prefix
   ```

6. Start a Jupyter Notebook instance, open a new notebook and check out the memory usage
   in the top right!

   ```bash
   jupyter notebook
   ```

7. If you want to test the memory limit display functionality, you can do so by setting
   the `MEM_LIMIT` environment variable (in bytes) when starting `jupyter notebook`.

   ```bash
   MEM_LIMIT=$(expr 128 \* 1024 \* 1024) jupyter notebook
   ```

8. NBResuse has adopted automatic code formatting so you shouldn't
need to worry too much about your code style.
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
`pre-commit run --all-files`.  You need to make the fixing commit
yourself after that.

9. It's a good idea to write tests to exercise any new features,
or that trigger any bugs that you have fixed to catch regressions. `pytest` is used to run the test suite. You can run the tests with:

```bash
python -m pytest -vvv nbresuse
```

in the repo directory.
