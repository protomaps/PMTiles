"""Module tests"""

from mercantile import Tile
import pytest

import rio_pmtiles.worker


@pytest.mark.parametrize("tile", [Tile(36, 73, 7), Tile(0, 0, 0), Tile(1, 1, 1)])
@pytest.mark.parametrize("filename", ["RGB.byte.tif", "RGBA.byte.tif"])
def test_process_tile(data, filename, tile):
    sourcepath = str(data.join(filename))
    rio_pmtiles.worker.init_worker(
        sourcepath,
        {
            "driver": "PNG",
            "dtype": "uint8",
            "nodata": 0,
            "height": 256,
            "width": 256,
            "count": 3,
            "crs": "EPSG:3857",
        },
        "nearest",
        {},
        {},
    )
    t, contents = rio_pmtiles.worker.process_tile(tile)
    assert t.x == tile.x
    assert t.y == tile.y
    assert t.z == tile.z
