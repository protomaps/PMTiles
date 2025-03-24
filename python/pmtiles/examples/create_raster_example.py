# Generates a raster tile archive for conformance testing.

from urllib.request import Request, urlopen
from pmtiles.tile import zxy_to_tileid, tileid_to_zxy, TileType, Compression
from pmtiles.writer import Writer

acc = 0

with open("terrarium_z0-3.pmtiles", "wb") as f:
    writer = Writer(f)

    for tileid in range(0, zxy_to_tileid(4, 0, 0)):
        acc += 1
        z, x, y = tileid_to_zxy(tileid)
        req = Request(f"https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png")
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
            "attribution": '<a href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md">Tilezen Joerd: Attribution</a>'
        },
    )
