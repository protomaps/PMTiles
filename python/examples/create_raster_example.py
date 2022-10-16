# Generates a raster tile archive for conformance testing.

from urllib.request import Request, urlopen
from pmtiles.tile import zxy_to_tileid, tileid_to_zxy, TileType, Compression
from pmtiles.writer import Writer

acc = 0

with open("stamen_toner_maxzoom3.pmtiles", "wb") as f:
    writer = Writer(f)

    for tileid in range(0, zxy_to_tileid(4, 0, 0)):
        acc += 1
        z, x, y = tileid_to_zxy(tileid)
        req = Request(f"https://stamen-tiles.a.ssl.fastly.net/toner/{z}/{x}/{y}.png")
        req.add_header(
            "User-Agent",
            "Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:47.0) Gecko/20100101 Firefox/47.0",
        )
        with urlopen(req) as f:
            writer.write_tile(tileid, f.read())

    writer.finalize(
        {
            "tile_type": TileType.PNG,
            "tile_compression": Compression.NONE,
            "min_zoom": 0,
            "max_zoom": 3,
            "min_lon_e7": int(-180.0 * 10000000),
            "min_lat_e7": int(-85.0 * 10000000),
            "max_lon_e7": int(180.0 * 10000000),
            "max_lat_e7": int(85.0 * 10000000),
            "center_zoom": 0,
            "center_lon_e7": 0,
            "center_lat_e7": 0,
        },
        {
            "attribution": 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, under <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>. Data by <a href="http://openstreetmap.org">OpenStreetMap</a>, under <a href="http://www.openstreetmap.org/copyright">ODbL</a>.'
        },
    )
