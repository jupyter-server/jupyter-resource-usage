from pathlib import Path

import setuptools

# The directory containing this file
HERE = Path(__file__).parent.resolve()

# The name of the project
NAME = "jupyter-resource-usage"
PACKAGE_NAME = NAME.replace("-", "_")
LABEXT_NAME = "@jupyter-server/resource-usage"
NBEXT_NAME = "jupyter_resource_usage"


lab_path = (HERE / PACKAGE_NAME / "labextension")
nb_path = (HERE / PACKAGE_NAME / "static")
src_path = (HERE / "packages" / "labextension")

# Representative files that should exist after a successful build
ensured_targets = [
    str(lab_path / "package.json"),
    str(lab_path / "static/style.js"),
]

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

with open("README.md", "r") as fh:
    long_description = fh.read()

setup_args = dict(
    name=NAME,
    version="0.6.0",
    url="https://github.com/jupyter-server/jupyter-resource-usage",
    author="Jupyter Development Team",
    description="Jupyter Extension to show resource usage",
    long_description=long_description,
    long_description_content_type="text/markdown",
    packages=setuptools.find_packages(),
    install_requires=["jupyter_server>=1.0.0", "prometheus_client", "psutil>=5.6.0"],
    extras_require={
        "dev": ["autopep8", "black", "pytest", "flake8", "pytest-cov>=2.6.1", "mock"]
    },
    zip_safe=False,
    include_package_data=True,
    license="BSD",
    classifiers=[
        "License :: OSI Approved :: BSD License",
        "Programming Language :: Python :: 3",
        "Framework :: Jupyter :: JupyterLab :: Extensions",
        "Framework :: Jupyter :: JupyterLab :: Extensions :: Prebuilt",
    ],
)

try:
    from jupyter_packaging import (
        wrap_installers,
        npm_builder,
        get_data_files
    )
    post_develop = npm_builder(
        build_cmd="build:prod", source_dir=src_path, build_dir=lab_path
    )
    setup_args['cmdclass'] = wrap_installers(post_develop=post_develop, ensured_targets=ensured_targets)
    setup_args['data_files'] = get_data_files(data_files_spec)
except ImportError as e:
    pass


if __name__ == "__main__":
    setuptools.setup(**setup_args)
