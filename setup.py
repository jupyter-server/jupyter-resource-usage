import os
from glob import glob

import setuptools
from jupyter_packaging import combine_commands
from jupyter_packaging import create_cmdclass
from jupyter_packaging import ensure_targets
from jupyter_packaging import get_version
from jupyter_packaging import install_npm

# The directory containing this file
HERE = os.path.abspath(os.path.dirname(__file__))

# The name of the project
NAME = "jupyter-resource-usage"
PACKAGE_NAME = NAME.replace("-", "_")

src_path = os.path.join(HERE, "packages", "labextension")
lab_path = os.path.join(HERE, PACKAGE_NAME, "labextension")
nb_path = os.path.join(HERE, PACKAGE_NAME, "static")

# Representative files that should exist after a successful build
jstargets = [
    os.path.join(src_path, "lib", "index.js"),
    os.path.join(lab_path, "package.json"),
]

package_data_spec = {PACKAGE_NAME: ["*"]}

labext_name = "@jupyter-server/resource-usage"
nbext_name = "jupyter_resource_usage"

data_files_spec = [
    ("share/jupyter/nbextensions/%s" % nbext_name, nb_path, "**"),
    ("share/jupyter/labextensions/%s" % labext_name, lab_path, "**"),
    ("share/jupyter/labextensions/%s" % labext_name, HERE, "install.json"),
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

cmdclass = create_cmdclass(
    "jsdeps", package_data_spec=package_data_spec, data_files_spec=data_files_spec
)

cmdclass["jsdeps"] = combine_commands(
    install_npm(src_path, build_cmd="build:prod", npm=["jlpm"]),
    ensure_targets(jstargets),
)

with open("README.md", "r") as fh:
    long_description = fh.read()

setuptools.setup(
    name=NAME,
    version="0.5.0",
    url="https://github.com/jupyter-server/jupyter-resource-usage",
    author="Jupyter Development Team",
    description="Simple Jupyter extension to show how much resources (RAM) your notebook is using",
    long_description=long_description,
    long_description_content_type="text/markdown",
    cmdclass=cmdclass,
    packages=setuptools.find_packages(),
    install_requires=["notebook>=5.6.0", "prometheus_client", "psutil>=5.6.0"],
    extras_require={
        "dev": ["autopep8", "black", "pytest", "flake8", "pytest-cov>=2.6.1", "mock"]
    },
    zip_safe=False,
    include_package_data=True,
    license="BSD",
    classifiers=[
        "License :: OSI Approved :: BSD License",
        "Programming Language :: Python :: 3",
    ],
)
