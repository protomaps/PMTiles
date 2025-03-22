import functools
import operator
import os
import shutil
import sys

import py
import pytest
import rasterio

from unittest import mock

test_files = [
    os.path.join(os.path.dirname(__file__), p)
    for p in [
        "data/RGB.byte.tif",
        "data/RGBA.byte.tif",
        "data/rgb-193f513.vrt",
        "data/rgb-fa48952.vrt",
    ]
]


def pytest_cmdline_main(config):
    # Bail if the test raster data is not present. Test data is not
    # distributed with sdists since 0.12.
    if functools.reduce(operator.and_, map(os.path.exists, test_files)):
        print("Test data present.")
    else:
        print("Test data not present. See download directions in tests/README.txt")
        sys.exit(1)


@pytest.fixture(scope="function")
def data(tmpdir):
    """A temporary directory containing a copy of the files in data."""
    datadir = tmpdir.ensure("tests/data", dir=True)
    for filename in test_files:
        shutil.copy(filename, str(datadir))
    return datadir


@pytest.fixture(scope="function")
def empty_data(tmpdir):
    """A temporary directory containing a folder with an empty data file."""
    filename = test_files[0]
    out_filename = os.path.join(str(tmpdir), "empty.tif")
    with rasterio.open(filename, "r") as src:
        with rasterio.open(out_filename, "w", **src.meta) as dst:
            pass
    return out_filename


@pytest.fixture()
def rgba_cutline_path():
    """Path to a GeoJSON rhombus within the extents of RGBA.byte.tif"""
    return os.path.join(os.path.dirname(__file__), "data/rgba_cutline.geojson")


@pytest.fixture()
def rgba_points_path():
    """Path to a pair of GeoJSON points. This is not a valid cutline."""
    return os.path.join(os.path.dirname(__file__), "data/rgba_points.geojson")
