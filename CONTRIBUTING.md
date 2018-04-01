# Contributing

Contributions to nbresuse are highly welcome!

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
   pip install --editable .
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