"""rio-pmtiles CLI"""

import functools
import logging
import math
import os
import sqlite3
import sys

import click
from cligj.features import iter_features
import concurrent.futures
import gzip
from itertools import islice
import json
import mercantile
from pyroaring import BitMap64
import rasterio
from rasterio.enums import Resampling
from rasterio.rio.options import creation_options, output_opt, _cb_key_val
from rasterio.warp import transform, transform_geom
import shapely.affinity
from shapely.geometry import mapping, shape
from shapely.ops import unary_union
import shapely.wkt
import supermercado.burntiles
from tqdm import tqdm
from pmtiles.tile import TileType, Entry, zxy_to_tileid, Compression, serialize_header, tileid_to_zxy
from pmtiles.writer import optimize_directories

from rio_pmtiles import __version__ as rio_pmtiles_version
from rio_pmtiles.worker import init_worker, process_tile


DEFAULT_NUM_WORKERS = None
RESAMPLING_METHODS = [method.name for method in Resampling]
TILES_CRS = "EPSG:3857"
WEBMERC_EXTENT = 40075016.68

log = logging.getLogger(__name__)


def resolve_inout(
    input=None, output=None, files=None, num_inputs=None
):
    """Resolves inputs and outputs from standard args and options.

    Parameters
    ----------
    input : str
        A single input filename, optional.
    output : str
        A single output filename, optional.
    files : str
        A sequence of filenames in which the last is the output filename.
    num_inputs : int
        Raise exceptions if the number of resolved input files is higher
        or lower than this number.

    Returns
    -------
    tuple (str, list of str)
        The resolved output filename and input filenames as a tuple of
        length 2.

    If provided, the output file may be overwritten. An output
    file extracted from files will not be overwritten unless
    overwrite is True.

    Raises
    ------
    click.BadParameter

    """
    resolved_output = output or (files[-1] if files else None)
    resolved_inputs = (
        [input]
        if input
        else [] + list(files[: -1 if not output else None])
        if files
        else []
    )

    if num_inputs is not None:
        if len(resolved_inputs) < num_inputs:
            raise click.BadParameter("Insufficient inputs")
        elif len(resolved_inputs) > num_inputs:
            raise click.BadParameter("Too many inputs")

    return resolved_output, resolved_inputs


def extract_features(ctx, param, value):
    if value is not None:
        with click.open_file(value, encoding="utf-8") as src:
            return list(iter_features(iter(src)))
    else:
        return None

def guess_maxzoom(crs, bounds, width, height, tile_size):
    (west, east), (south, north) = transform(
        crs, "EPSG:3857", bounds[::2], bounds[1::2]
    )
    if east <= -WEBMERC_EXTENT/2:
        east = -east
    res_x = (east - west) / width
    res_y = (north - south) / height
    raster_resolution = min(res_x, res_y)
    return math.ceil(math.log2(WEBMERC_EXTENT / (tile_size * raster_resolution)))


@click.command(short_help="Export a dataset to PMTiles.")
@click.argument(
    "files",
    nargs=-1,
    type=click.Path(resolve_path=True),
    required=True,
    metavar="INPUT [OUTPUT]",
)
@output_opt
@click.option("--name", help="PMTiles metadata name.")
@click.option("--description", help="PMTiles metadata description.")
@click.option("--attribution", help="PMTiles metadata attribution.")
@click.option(
    "--overlay",
    "layer_type",
    flag_value="overlay",
    default=True,
    help="Export as an overlay (the default).",
)
@click.option(
    "--baselayer", "layer_type", flag_value="baselayer", help="Export as a base layer."
)
@click.option(
    "-f",
    "--format",
    "img_format",
    type=click.Choice(["JPEG", "PNG", "WEBP"]),
    default="WEBP",
    help="Tile image format.",
)
@click.option(
    "--tile-size",
    default=512,
    show_default=True,
    type=int,
    help="Width and height of individual square tiles to create.",
)
@click.option(
    "--zoom-levels",
    default=None,
    metavar="MIN..MAX",
    help="A min..max range of export zoom levels. "
    "The default min zoom level is 0 (dataset "
    "contained in a single tile), and the default "
    "max is calculated based on the available "
    "detail in the dataset. Either or both of "
    "min/max may be omitted.",
)
@click.option(
    "-j",
    "num_workers",
    type=int,
    default=DEFAULT_NUM_WORKERS,
    help="Number of workers (default: number of computer's processors).",
)
@click.option(
    "--src-nodata",
    default=None,
    show_default=True,
    type=float,
    help="Manually override source nodata",
)
@click.option(
    "--dst-nodata",
    default=None,
    show_default=True,
    type=float,
    help="Manually override destination nodata",
)
@click.option(
    "--resampling",
    type=click.Choice(RESAMPLING_METHODS),
    default="bilinear",
    show_default=True,
    help="Resampling method to use.",
)
@click.version_option(version=rio_pmtiles_version, message="%(version)s")
@click.option(
    "--rgba", default=False, is_flag=True, help="Select RGBA output. For PNG or WEBP only."
)
@click.option(
    "--silent", default=False, is_flag=True, help="Don't display progress bar."
)
@click.option(
    "--cutline",
    type=click.Path(exists=True),
    callback=extract_features,
    default=None,
    help="Path to a GeoJSON FeatureCollection to be used as a cutline. Only source pixels within the cutline features will be exported.",
)
@click.option(
    "--oo",
    "open_options",
    metavar="NAME=VALUE",
    multiple=True,
    callback=_cb_key_val,
    help="Format driver-specific options to be used when accessing the input dataset. See the GDAL format driver documentation for more information.",
)
@creation_options
@click.option(
    "--wo",
    "warp_options",
    metavar="NAME=VALUE",
    multiple=True,
    callback=_cb_key_val,
    help="See the GDAL warp options documentation for more information.",
)
@click.option(
    "--exclude-empty-tiles/--include-empty-tiles",
    default=True,
    is_flag=True,
    help="Whether to exclude or include empty tiles from the output.",
)
@click.pass_context
def pmtiles(
    ctx,
    files,
    output,
    name,
    description,
    attribution,
    layer_type,
    img_format,
    tile_size,
    zoom_levels,
    num_workers,
    src_nodata,
    dst_nodata,
    resampling,
    rgba,
    silent,
    cutline,
    open_options,
    creation_options,
    warp_options,
    exclude_empty_tiles,
):
    """Export a dataset to PMTiles.

    The input dataset may have any coordinate reference system. It must
    have at least three bands, which will be become the red, blue, and
    green bands of the output image tiles.

    An optional fourth alpha band may be copied to the output tiles by
    using the --rgba option in combination with the PNG or WEBP formats.
    This option requires that the input dataset has at least 4 bands.

    The default quality for JPEG and WEBP output (possible range:
    10-100) is 75. This value can be changed with the use of the QUALITY
    creation option, e.g. `--co QUALITY=90`.  The default zlib
    compression level for PNG output (possible range: 1-9) is 6. This
    value can be changed like `--co ZLEVEL=8`.  Lossless WEBP can be
    chosen with `--co LOSSLESS=TRUE`.

    If no zoom levels are specified, the defaults are the zoom levels
    nearest to the one at which one tile may contain the entire source
    dataset.

    If a name or description for the output file are not provided,
    they will be taken from the input dataset's filename.

    This command is suited for small to medium (~1 GB) sized sources.

    Python package: rio-pmtiles (https://github.com/protomaps/PMTiles).

    """
    log = logging.getLogger(__name__)

    output, files = resolve_inout(
        files=files, output=output, num_inputs=1,
    )
    inputfile = files[0]

    with ctx.obj["env"]:

        # Read metadata from the source dataset.
        with rasterio.open(inputfile, **open_options) as src:

            if dst_nodata is not None and (
                src_nodata is None and src.profile.get("nodata") is None
            ):
                raise click.BadParameter(
                    "--src-nodata must be provided because " "dst-nodata is not None."
                )
            base_kwds = {"dst_nodata": dst_nodata, "src_nodata": src_nodata}

            if src_nodata is not None:
                base_kwds.update(nodata=src_nodata)

            if dst_nodata is not None:
                base_kwds.update(nodata=dst_nodata)

            # Name and description.
            name = name or os.path.basename(src.name)
            description = description or src.name
            attribution = attribution or None

            # Compute the geographic bounding box of the dataset.
            (west, east), (south, north) = transform(
                src.crs, "EPSG:4326", src.bounds[::2], src.bounds[1::2]
            )

            # cutlines must be transformed from CRS84 to src pixel/line
            # coordinates and then formatted as WKT.
            if cutline is not None:
                geoms = [shape(f["geometry"]) for f in cutline]
                union = unary_union(geoms)
                if union.geom_type not in ("MultiPolygon", "Polygon"):
                    raise click.ClickException("Unexpected cutline geometry type")
                west, south, east, north = union.bounds
                cutline_src = shape(
                    transform_geom("OGC:CRS84", src.crs, mapping(union))
                )
                invtransform = ~src.transform
                shapely_matrix = (
                    invtransform.a,
                    invtransform.b,
                    invtransform.d,
                    invtransform.e,
                    invtransform.xoff,
                    invtransform.yoff,
                )
                cutline_rev = shapely.affinity.affine_transform(
                    cutline_src, shapely_matrix
                )
                warp_options["cutline"] = shapely.wkt.dumps(cutline_rev)

        # Resolve the minimum and maximum zoom levels for export.
        maxzoom_in_file = guess_maxzoom(src.crs, src.bounds, src.width, src.height, tile_size)
        if zoom_levels:
            specified_levels = zoom_levels.split("..")
            minzoom = specified_levels[0]
            minzoom = 0 if minzoom == "" else int(minzoom)
            maxzoom = specified_levels[1]
            maxzoom = maxzoom_in_file if maxzoom == "" else int(maxzoom)
        else:
            minzoom = 0
            maxzoom = maxzoom_in_file

        log.debug("Zoom range: %d..%d", minzoom, maxzoom)

        if rgba:
            if img_format == "JPEG":
                raise click.BadParameter(
                    "RGBA output is not possible with JPEG format."
                )
            else:
                count = 4
        else:
            count = src.count

        # Parameters for creation of tile images.
        base_kwds.update(
            {
                "driver": img_format.upper(),
                "dtype": "uint8",
                "nodata": 255 if rgba else 0,
                "height": tile_size,
                "width": tile_size,
                "count": count,
                "crs": TILES_CRS,
            }
        )

        # Constrain bounds.
        EPS = 1.0e-10
        west = max(-180 + EPS, west)
        south = max(-85.051129, south)
        east = min(180 - EPS, east)
        north = min(85.051129, north)

        outfile = open(output, "wb")
        outfile.write(b"\x00" * 16384)
        entries = []

        metadata = gzip.compress(json.dumps({'name':name,'type':layer_type,'description':description,'writer':f'rio-pmtiles {rio_pmtiles_version}','attribution':attribution,'tileSize':int(tile_size)}).encode())
        outfile.write(metadata)

        header = {}
        header["version"] = 3
        header["root_offset"] = 127
        header["metadata_offset"] = 16384
        header["metadata_length"] = len(metadata)
        header["tile_data_offset"] = 16384 + len(metadata)

        if img_format == "JPEG":
            header["tile_type"] = TileType.JPEG
        elif img_format == "WEBP":
            header["tile_type"] = TileType.WEBP
        elif img_format == "PNG":
            header["tile_type"] = TileType.PNG

        header["tile_compression"] = Compression.NONE
        header["internal_compression"] = Compression.GZIP
        header["clustered"] = True
        header["min_zoom"] = minzoom
        header["max_zoom"] = maxzoom
        header["min_lon_e7"] = int(west * 10000000)
        header["min_lat_e7"] = int(south * 10000000)
        header["max_lon_e7"] = int(east * 10000000)
        header["max_lat_e7"] = int(north * 10000000)
        header["center_zoom"] = minzoom
        header["center_lon_e7"] = int((west + east) / 2 * 10000000)
        header["center_lat_e7"] = int((south + north) / 2 * 10000000)

        tiles = BitMap64()

        if cutline:
            for zk in range(minzoom, maxzoom + 1):
                for arr in supermercado.burntiles.burn(cutline, zk):
                    tiles.add(zxy_to_tileid(arr[2],arr[0],arr[1]))
        else:
            for tile in mercantile.tiles(west, south, east, north, range(minzoom, maxzoom + 1)):
                tiles.add(zxy_to_tileid(tile.z,tile.x,tile.y))

        def unwrap_tiles(bmap):
            for tile_id in bmap:
                z, x, y = tileid_to_zxy(tile_id)
                yield mercantile.Tile(x,y,z)

        if silent:
            pbar = None
        else:
            pbar = tqdm(total=len(tiles))

        tile_data_offset = 0

        """Warp imagery into tiles and write to pmtiles archive.
        """
        with concurrent.futures.ProcessPoolExecutor(
            max_workers=num_workers,
            initializer=init_worker,
            initargs=(
                inputfile,
                base_kwds,
                resampling,
                open_options,
                warp_options,
                creation_options,
                exclude_empty_tiles,
                maxzoom_in_file,
            ),
        ) as executor:
            for tile, contents in executor.map(process_tile, unwrap_tiles(tiles)):
                if pbar is not None:
                    pbar.update(1)
                if contents is None:
                    log.info("Tile %r is empty and will be skipped", tile)
                    continue
                log.info("Inserting tile: tile=%r", tile)

                entries.append(Entry(zxy_to_tileid(tile.z,tile.x,tile.y), tile_data_offset, len(contents), 1))
                outfile.write(contents)
                tile_data_offset += len(contents)

        header["addressed_tiles_count"] = len(entries)
        header["tile_entries_count"] = len(entries)
        header["tile_contents_count"] = len(entries)
        header["tile_data_length"] = tile_data_offset

        root, leaves, num_leaves = optimize_directories(entries, 16384-127)
        header["root_length"] = len(root)
        if len(leaves) > 0:
            outfile.write(leaves)
            header["leaf_directory_offset"] = 16384 + len(metadata) + tile_data_offset
            header["leaf_directory_length"] = len(leaves)
        else:
            header["leaf_directory_offset"] = header["tile_data_offset"]
            header["leaf_directory_length"] = 0

        outfile.seek(0)
        outfile.write(serialize_header(header))
        outfile.write(root)
