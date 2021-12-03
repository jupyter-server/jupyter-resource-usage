from pathlib import Path

import setuptools

# The directory containing this file
HERE = Path(__file__).parent.resolve()

# The name of the project
NAME = "jupyter-resource-usage"
PACKAGE_NAME = NAME.replace("-", "_")
LABEXT_NAME = "@jupyter-server/resource-usage"
NBEXT_NAME = "jupyter_resource_usage"


lab_path = HERE / PACKAGE_NAME / "labextension"
nb_path = HERE / PACKAGE_NAME / "static"
src_path = HERE / "packages" / "labextension"

# Representative files that should exist after a successful build
ensured_targets = [str(lab_path / "package.json"), str(lab_path / "static/style.js")]

data_files_spec = [
    ("share/jupyter/nbextensions/%s" % NBEXT_NAME, nb_path, "**"),
    ("share/jupyter/labextensions/%s" % LABEXT_NAME, lab_path, "**"),
    ("share/jupyter/labextensions/%s" % LABEXT_NAME, HERE, "install.json"),
    (
        "etc/jupyter/jupyter_server_config.d",
        "jupyter-config/jupyter_server_config.d",
        "jupyter_resource_usage.json",
    ),
    (
        "etc/jupyter/jupyter_notebook_config.d",
        "jupyter-config/jupyter_notebook_config.d",
        "jupyter_resource_usage.json",
    ),
    (
        "etc/jupyter/nbconfig/notebook.d",
        "jupyter-config/nbconfig/notebook.d",
        "jupyter_resource_usage.json",
    ),
]

try:
    from jupyter_packaging import wrap_installers, npm_builder, get_data_files

    builder = npm_builder(build_cmd="build:prod", npm="jlpm", force=True)
    cmdclass = wrap_installers(post_develop=builder, ensured_targets=ensured_targets)
    setup_args = dict(cmdclass=cmdclass, data_files=get_data_files(data_files_spec))
except ImportError:
    setup_args = dict()


if __name__ == "__main__":
    setuptools.setup(**setup_args)
