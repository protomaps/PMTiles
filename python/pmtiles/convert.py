# pmtiles to files
import gzip
import json
import os
import sqlite3
from pmtiles.writer import write
from pmtiles.reader import Reader, MmapSource, all_tiles
from .tile import zxy_to_tileid, tileid_to_zxy, TileType, Compression


def mbtiles_to_header_json(mbtiles_metadata):
    header = {}

    header["min_zoom"] = int(mbtiles_metadata["minzoom"])

    header["max_zoom"] = int(mbtiles_metadata["maxzoom"])

    bounds = mbtiles_metadata["bounds"].split(",")
    header["min_lon_e7"] = int(float(bounds[0]) * 10000000)
    header["min_lat_e7"] = int(float(bounds[1]) * 10000000)
    header["max_lon_e7"] = int(float(bounds[2]) * 10000000)
    header["max_lat_e7"] = int(float(bounds[3]) * 10000000)

    center = mbtiles_metadata["center"].split(",")
    header["center_lon_e7"] = int(float(center[0]) * 10000000)
    header["center_lat_e7"] = int(float(center[1]) * 10000000)
    header["center_zoom"] = int(center[2])

    tile_format = mbtiles_metadata["format"]
    if tile_format == "pbf":
        header["tile_type"] = TileType.MVT
    elif tile_format == "png":
        header["tile_type"] = TileType.PNG
    elif tile_format == "jpeg":
        header["tile_type"] = TileType.JPEG
    elif tile_format == "webp":
        header["tile_type"] = TileType.WEBP
    else:
        header["tile_type"] = TileType.UNKNOWN

    if mbtiles_metadata.get("compression") == "gzip":
        header["tile_compression"] = Compression.GZIP  # TODO: does this ever matter?
    else:
        header["tile_compression"] = Compression.UNKNOWN

    return header, mbtiles_metadata


def mbtiles_to_pmtiles(input, output, maxzoom):
    conn = sqlite3.connect(input)
    cursor = conn.cursor()

    with write(output) as writer:

        # collect a set of all tile IDs
        tileid_set = []
        for row in cursor.execute(
            "SELECT zoom_level,tile_column,tile_row FROM tiles WHERE zoom_level <= ?",
            (maxzoom or 99,),
        ):
            flipped = (1 << row[0]) - 1 - row[2]
            tileid_set.append(zxy_to_tileid(row[0], row[1], flipped))

        tileid_set.sort()

        # query the db in ascending tile order
        for tileid in tileid_set:
            z, x, y = tileid_to_zxy(tileid)
            flipped = (1 << z) - 1 - y
            res = cursor.execute(
                "SELECT tile_data FROM tiles WHERE zoom_level = ? AND tile_column = ? AND tile_row = ?",
                (z, x, flipped),
            )
            data = res.fetchone()[0]
            # force gzip compression only for vector
            if data[0:2] != b"\x1f\x8b":
                data = gzip.compress(data)
            writer.write_tile(tileid, data)

        mbtiles_metadata = {}
        for row in cursor.execute("SELECT name,value FROM metadata"):
            mbtiles_metadata[row[0]] = row[1]

        pmtiles_header, pmtiles_metadata = mbtiles_to_header_json(mbtiles_metadata)
        result = writer.finalize(pmtiles_header, pmtiles_metadata)

    conn.close()


def pmtiles_to_mbtiles(input, output):
    conn = sqlite3.connect(output)
    cursor = conn.cursor()
    cursor.execute("CREATE TABLE metadata (name text, value text);")
    cursor.execute(
        "CREATE TABLE tiles (zoom_level integer, tile_column integer, tile_row integer, tile_data blob);"
    )

    with open(input, "r+b") as f:
        source = MmapSource(f)

        reader = Reader(source)
        header = reader.header()
        metadata = reader.metadata()

        if "minzoom" not in metadata:
            metadata["minzoom"] = header["min_zoom"]

        if "maxzoom" not in metadata:
            metadata["maxzoom"] = header["max_zoom"]

        if "bounds" not in metadata:
            min_lon = header["min_lon_e7"] / 10000000
            min_lat = header["min_lat_e7"] / 10000000
            max_lon = header["max_lon_e7"] / 10000000
            max_lat = header["max_lat_e7"] / 10000000
            metadata["bounds"] = f"{min_lon},{min_lat},{max_lon},{max_lat}"

        if "center" not in metadata:
            center_lon = header["center_lon_e7"] / 10000000
            center_lat = header["center_lat_e7"] / 10000000
            center_zoom = header["center_zoom"]
            metadata["center"] = f"{center_lon},{center_lat},{center_zoom}"

        if "format" not in metadata:
            if header["tile_type"] == TileType.MVT:
                metadata["format"] = "pbf"

        for k, v in metadata.items():
            cursor.execute("INSERT INTO metadata VALUES(?,?)", (k, v))

        for zxy, tile_data in all_tiles(source):
            flipped_y = (1 << zxy[0]) - 1 - zxy[2]
            cursor.execute(
                "INSERT INTO tiles VALUES(?,?,?,?)",
                (zxy[0], zxy[1], flipped_y, tile_data),
            )

    cursor.execute(
        "CREATE UNIQUE INDEX tile_index on tiles (zoom_level, tile_column, tile_row);"
    )
    conn.commit()
    conn.close()


def pmtiles_to_dir(input, output):
    os.makedirs(output)
    with open(input, "r+b") as f:
        source = MmapSource(f)

        reader = Reader(source)
        with open(os.path.join(output, "metadata.json"), "w") as f:
            f.write(json.dumps(reader.metadata()))

        for zxy, tile_data in all_tiles(source):
            directory = os.path.join(output, str(zxy[0]), str(zxy[1]))
            path = os.path.join(directory, str(zxy[2]) + "." + "mvt")
            os.makedirs(directory, exist_ok=True)
            with open(path, "wb") as f:
                f.write(data)
