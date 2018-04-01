import setuptools

setuptools.setup(
    name="nbresuse",
    version='0.2.0',
    url="https://github.com/yuvipanda/nbresuse",
    author="Yuvi Panda",
    description="Simple Jupyter extension to show how much resources (RAM) your notebook is using",
    packages=setuptools.find_packages(),
    install_requires=[
        'psutil',
        'notebook',
    ],
    package_data={'nbresuse': ['static/*']},
)
