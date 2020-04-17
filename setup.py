import pathlib
from glob import glob

import setuptools

# The directory containing this file
HERE = pathlib.Path(__file__).parent

# The text of the README file
README = (HERE / "README.md").read_text()

setuptools.setup(
    name="nbresuse",
    version="0.3.4",
    url="https://github.com/yuvipanda/nbresuse",
    author="Yuvi Panda",
    description="Simple Jupyter extension to show how much resources (RAM) your notebook is using",
    long_description=README,
    long_description_content_type="text/markdown",
    license="BSD",
    classifiers=[
        "License :: OSI Approved :: BSD License",
        "Programming Language :: Python :: 3",
    ],
    packages=setuptools.find_packages(),
    install_requires=["notebook>=5.6.0", "prometheus_client"],
    extras_require={
        "resources": ["psutil>=5.6.0"],
        "dev": ["autopep8", "pytest", "flake8", "pytest-cov>=2.6.1", "mock"],
    },
    data_files=[
        ("share/jupyter/nbextensions/nbresuse", glob("nbresuse/static/*")),
        (
            "etc/jupyter/jupyter_notebook_config.d",
            ["nbresuse/etc/serverextension.json"],
        ),
        ("etc/jupyter/nbconfig/notebook.d", ["nbresuse/etc/nbextension.json"]),
    ],
    zip_safe=False,
    include_package_data=True,
)
