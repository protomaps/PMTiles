"""rio-pmtiles processing worker"""

import logging
import warnings

from rasterio.enums import Resampling
from rasterio.io import MemoryFile
from rasterio.transform import from_bounds as transform_from_bounds
from rasterio.warp import reproject, transform_bounds
from rasterio.windows import Window
from rasterio.windows import from_bounds as window_from_bounds
import mercantile
import rasterio

TILES_CRS = "EPSG:3857"

log = logging.getLogger(__name__)


def init_worker(
    path,
    profile,
    resampling_method,
    open_opts=None,
    warp_opts=None,
    creation_opts=None,
    exclude_empties=True,
    max_zoom=None,
):
    global base_kwds, filename, resampling, open_options, warp_options, creation_options, exclude_empty_tiles, max_zoom_level
    resampling = Resampling[resampling_method]
    base_kwds = profile.copy()
    filename = path
    open_options = open_opts.copy() if open_opts is not None else {}
    warp_options = warp_opts.copy() if warp_opts is not None else {}
    creation_options = creation_opts.copy() if creation_opts is not None else {}
    exclude_empty_tiles = exclude_empties
    max_zoom_level = max_zoom


def process_tile(tile):
    """Process a single PMTiles tile

    Parameters
    ----------
    tile : mercantile.Tile
    warp_options : Mapping
        GDAL warp options as keyword arguments.

    Returns
    -------

    tile : mercantile.Tile
        The input tile.
    bytes : bytearray
        Image bytes corresponding to the tile.

    """
    global base_kwds, resampling, filename, open_options, warp_options, creation_options, exclude_empty_tiles, max_zoom_level

    # Determine overview level to use
    temp_src = rasterio.open(filename)
    overviews = temp_src.overviews(1)
    temp_src.close()
    overview_level = None
    if overviews and tile.z < max_zoom_level:
        OVERSAMPLING_FACTOR = 4  # oversampling factor to ensure sufficient pixels for resampling operations
        target_factor = 2 ** (max_zoom_level - tile.z) / OVERSAMPLING_FACTOR
        best_overview = overview_level
        best_score = float("inf")
        for i_overview, factor in enumerate(overviews):
            if factor <= target_factor:
                score = abs(factor - target_factor)
                if score < best_score:
                    best_score = score
                    best_overview = i_overview
        overview_level = best_overview

    if overview_level is not None:
        open_options["OVERVIEW_LEVEL"] = overview_level

    with rasterio.open(filename, **open_options) as src:

        bbox = mercantile.xy_bounds(tile)

        kwds = base_kwds.copy()
        kwds.update(**creation_options)
        kwds["transform"] = transform_from_bounds(
            bbox.left, bbox.bottom, bbox.right, bbox.top, kwds["width"], kwds["height"]
        )
        src_nodata = kwds.pop("src_nodata", None)
        dst_nodata = kwds.pop("dst_nodata", None)

        src_alpha = None
        dst_alpha = None
        bindexes = None

        if kwds["count"] == 4:
            bindexes = [1, 2, 3]
            dst_alpha = 4

            if src.count == 4:
                src_alpha = 4
            else:
                kwds["count"] = 4
        else:
            bindexes = list(range(1, kwds["count"] + 1))

        warnings.simplefilter("ignore")

        log.info("Reprojecting tile: tile=%r", tile)

        with MemoryFile() as memfile:

            with memfile.open(**kwds) as tmp:

                # determine window of source raster corresponding to the tile
                # image, with small buffer at edges
                try:
                    west, south, east, north = transform_bounds(
                        TILES_CRS, src.crs, bbox.left, bbox.bottom, bbox.right, bbox.top
                    )
                    tile_window = window_from_bounds(
                        west, south, east, north, transform=src.transform
                    )
                    adjusted_tile_window = Window(
                        tile_window.col_off - 1,
                        tile_window.row_off - 1,
                        tile_window.width + 2,
                        tile_window.height + 2,
                    )
                    tile_window = adjusted_tile_window.round_offsets().round_shape()

                    # if no data in window, skip processing the tile
                    if (
                        exclude_empty_tiles
                        and not src.read_masks(1, window=tile_window).any()
                    ):
                        return tile, None

                except ValueError:
                    log.info(
                        "Tile %r will not be skipped, even if empty. This is harmless.",
                        tile,
                    )

                num_threads = int(warp_options.pop("num_threads", 2))

                reproject(
                    rasterio.band(src, bindexes),
                    rasterio.band(tmp, bindexes),
                    src_nodata=src_nodata,
                    dst_nodata=dst_nodata,
                    src_alpha=src_alpha,
                    dst_alpha=dst_alpha,
                    num_threads=num_threads,
                    resampling=resampling,
                    **warp_options
                )

            return tile, memfile.read()
