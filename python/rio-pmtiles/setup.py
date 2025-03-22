from codecs import open as codecs_open
from setuptools import setup, find_packages


# Parse the version from the rio_pmtiles module.
with open('rio_pmtiles/__init__.py') as f:
    for line in f:
        if line.find("__version__") >= 0:
            version = line.split("=")[1].strip()
            version = version.strip('"')
            version = version.strip("'")
            break

# Get the long description from the relevant file
with codecs_open('README.rst', encoding='utf-8') as f:
    long_description = f.read()


setup(
    name="rio-pmtiles",
    version=version,
    description=u"A Rasterio plugin command that exports PMTiles",
    long_description=long_description,
    classifiers=[],
    keywords="",
    author=u"Brandon Liu",
    author_email="brandon@protomaps.com",
    url="https://github.com/protomaps/PMTiles",
    license="MIT",
    packages=find_packages(exclude=["ez_setup", "examples", "tests"]),
    include_package_data=True,
    zip_safe=False,
    python_requires=">=3.7.0",
    install_requires=[
        "click",
        "cligj>=0.5",
        "mercantile",
        "pmtiles~=3.0",
        "pyroaring~=1.0",
        "rasterio~=1.0",
        "shapely~=2.0.0",
        "supermercado",
        "tqdm~=4.0",
    ],
    extras_require={"test": ["coveralls", "pytest", "pytest-cov"]},
    entry_points="""
      [rasterio.rio_plugins]
      pmtiles=rio_pmtiles.scripts.cli:pmtiles
      """
      )
