# Making a new release of jupyter-resource-usage

## Getting a clean environment

Creating a new environment can help avoid pushing local changes and any extra tag.

```bash
conda create -n jupyter-resource-usage-release -c conda-forge twine keyring jupyter-packaging python
conda activate jupyter-resource-usage-release

# install JupyterLab to build the extension
python -m pip install --pre jupyterlab
```

Alternatively, the local repository can be cleaned with:

```bash
git clean -fdx
```

## Releasing on PyPI

Make sure the `dist/` folder is empty.

1. Update the version in `setup.py`
2. `python setup.py sdist bdist_wheel`
3. Double check the size of the bundles in the `dist/` folder
4. Run the tests
  - `pip install "dist/jupyter-resource-usage-X.Y.Z-py3-none-any.whl[dev]"`
  - `python -m pytest`
5. `export TWINE_USERNAME=mypypi_username`
6. `twine upload dist/*`

## Releasing on conda-forge

The easiest is to wait for the bot to open the PR automatically.

To do the release manually:

1. Open a new PR on https://github.com/conda-forge/jupyter-resource-usage-feedstock to update the `version` and the `sha256` hash
2. Wait for the tests
3. Merge the PR

The new version will be available on `conda-forge` soon after.

## Committing and tagging

Commit the changes, create a new release tag, and update the `stable` branch (for Binder), where `x.y.z` denotes the new version:

```bash
git checkout master
git add setup.py
git commit -m "Release x.y.z"
git tag x.y.z
git checkout stable
git reset --hard master
git push origin master stable x.y.z
```
