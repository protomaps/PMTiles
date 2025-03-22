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
    elif tile_format == "avif":
        header["tile_type"] = TileType.AVIF
    else:
        header["tile_type"] = TileType.UNKNOWN

    if tile_format == "pbf" or mbtiles_metadata.get("compression") == "gzip":
        header["tile_compression"] = Compression.GZIP
    else:
        header["tile_compression"] = Compression.NONE

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

        mbtiles_metadata = {}
        for row in cursor.execute("SELECT name,value FROM metadata"):
            mbtiles_metadata[row[0]] = row[1]
        is_pbf = mbtiles_metadata["format"] == "pbf"

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
            if is_pbf and data[0:2] != b"\x1f\x8b":
                data = gzip.compress(data)
            writer.write_tile(tileid, data)

        pmtiles_header, pmtiles_metadata = mbtiles_to_header_json(mbtiles_metadata)
        if maxzoom:
            pmtiles_header["max_zoom"] = int(maxzoom)
            mbtiles_metadata["maxzoom"] = maxzoom
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

        json_metadata = {}
        for k, v in metadata.items():
            if k == "vector_layers":
                json_metadata["vector_layers"] = v
                continue
            elif k == "tilestats":
                json_metadata["tilestats"] = v
                continue
            elif not isinstance(v, str):
                v = json.dumps(v, ensure_ascii=False)
            cursor.execute("INSERT INTO metadata VALUES(?,?)", (k, v))

        if len(json_metadata) > 0:
            cursor.execute(
                "INSERT INTO metadata VALUES(?,?)",
                ("json", json.dumps(json_metadata, ensure_ascii=False)),
            )

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
                f.write(tile_data)


def disk_to_pmtiles(directory_path, output, maxzoom, **kwargs):
    """Convert a directory of raster format tiles on disk to PMTiles.

    Requires metadata.json in the root of the directory.

    Tiling scheme of the directory is assumed to be zxy unless specified.

    Args:
        directory_path (str): Root directory of tiles.
        output (str): Path of PMTiles to be written.
        maxzoom (int, "auto"): Max zoom level to use. If "auto", uses highest zoom in directory.

    Keyword args:
        scheme (str): Tiling scheme of the directory ('ags', 'gwc', 'tms', 'zyx', 'zxy' (default)).
        tile_format (str): Image format of the tiles ('png', 'jpeg', 'webp', 'avif') if not given in the metadata.
        verbose (bool): Set True to print progress.

    Uses modified elements of 'disk_to_mbtiles' from mbutil

    Copyright (c), Development Seed
    All rights reserved.

    Licensed under BSD 3-Clause
    """
    verbose = kwargs.get("verbose")
    try:
        metadata = json.load(open(os.path.join(directory_path, 'metadata.json'), 'r'))
    except IOError:
        raise Exception("metadata.json not found in directory")

    tile_format = kwargs.get('tile_format', metadata.get("format"))
    if not tile_format:
        raise Exception("tile format not found in metadata.json nor specified as keyword argument")
    metadata["format"] = tile_format  # Add 'format' to metadata

    scheme = kwargs.get('scheme')

    # Collect a set of all tile IDs
    z_set = []  # List of all zoom levels for auto-detecting maxzoom.
    tileid_path_set = []  # List of tile (id, filepath) pairs
    zoom_dirs = get_dirs(directory_path)
    zoom_dirs.sort(key=len)
    try:
        collect_max = int(maxzoom)
    except ValueError:
        collect_max = 99
    collect_min = metadata.get("minzoom", 0)
    count = 0
    warned = False
    for zoom_dir in zoom_dirs:
        if scheme == 'ags':
            z = int(zoom_dir.replace("L", ""))
        elif scheme == 'gwc':
            z=int(zoom_dir[-2:])
        else:
            z = int(zoom_dir)
        if not collect_min <= z <= collect_max:
            continue
        z_set.append(z)
        if z > 9 and not warned:
            print(" Warning: Large tilesets (z > 9) require extreme processing times.")
            warned = True
        if verbose:
            print(" Searching for tiles at z=%s ..." % (z), end="", flush=True)
        count = 0
        for row_dir in get_dirs(os.path.join(directory_path, zoom_dir)):
            if scheme == 'ags':
                y = int(row_dir.replace("R", ""), 16)
            elif scheme == 'gwc':
                pass
            elif scheme == 'zyx':
                y = int(row_dir)
            else:
                x = int(row_dir)
            for current_file in os.listdir(os.path.join(directory_path, zoom_dir, row_dir)):
                if current_file == ".DS_Store":
                    pass
                else:
                    file_name, _ = current_file.split('.',1)
                    if scheme == 'tms':
                        y = flip_y(z, int(file_name))
                    elif scheme == 'ags':
                        x = int(file_name.replace("C", ""), 16)
                    elif scheme == 'gwc':
                        x, y = file_name.split('_')
                        x = int(x)
                        y = flip_y(z, int(y))
                    elif scheme == 'zyx':
                        x = int(file_name)
                    else:
                        y = int(file_name)

                    tileid = zxy_to_tileid(z, x, y)
                    filepath = os.path.join(directory_path, zoom_dir, row_dir, current_file)
                    tileid_path_set.append((tileid, filepath))
                    count = count + 1
        if verbose:
            print(" found %s" % (count))

    n_tiles = len(tileid_path_set)
    if verbose:
        print(" Sorting list of %s tile IDs ..." % (n_tiles), end="")
    tileid_path_set.sort(key=lambda x: x[0])  # Sort by tileid
    if verbose:
        print(" done.")

    maxzoom = max(z_set) if maxzoom == "auto" else int(maxzoom)
    metadata["maxzoom"] = maxzoom

    if not metadata.get("minzoom"):
        metadata["minzoom"] = min(z_set)

    is_pbf = tile_format == "pbf"

    with write(output) as writer:

        # read tiles in ascending tile order
        count = 0
        if verbose:
            count_step = (2**(maxzoom-3))**2 if maxzoom <= 9 else (2**(9-3))**2
            print(" Begin writing %s to .pmtiles ..." % (n_tiles), flush=True)
        for tileid, filepath in tileid_path_set:
            f = open(filepath, 'rb')
            data = f.read()
            # force gzip compression only for vector
            if is_pbf and data[0:2] != b"\x1f\x8b":
                data = gzip.compress(data)
            writer.write_tile(tileid, data)
            count = count + 1
            if verbose and (count % count_step) == 0:
                print(" %s tiles inserted of %s" % (count, n_tiles), flush=True)

        if verbose and (count % count_step) != 0:
            print(" %s tiles inserted of %s" % (count, n_tiles))

        pmtiles_header, pmtiles_metadata = mbtiles_to_header_json(metadata)
        pmtiles_header["max_zoom"] = maxzoom
        result = writer.finalize(pmtiles_header, pmtiles_metadata)


def get_dirs(path):
    """'get_dirs' from mbutil

    Copyright (c), Development Seed
    All rights reserved

    Licensed under BSD 3-Clause
    """
    return [name for name in os.listdir(path)
        if os.path.isdir(os.path.join(path, name))]


def flip_y(zoom, y):
    """'flip_y' from mbutil

    Copyright (c), Development Seed
    All rights reserved

    Licensed under BSD 3-Clause
    """
    return (2**zoom-1) - y
