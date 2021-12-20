import setuptools

with open("README.md", "r") as fh:
    long_description = fh.read()

setuptools.setup(
    name="pmtiles",
    version="0.2.0",
    author="Brandon Liu",
    author_email="brandon@protomaps.com",
    description="Library and utilities to write and read PMTiles files - cloud-optimized archives of map tiles.",
    license="BSD-3-Clause",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/protomaps/pmtiles",
    packages=setuptools.find_packages(),
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: BSD License",
        "Operating System :: OS Independent",
    ],
    scripts=['bin/pmtiles-convert','bin/pmtiles-serve','bin/pmtiles-show'],
    requires_python='>=3.0'
)
