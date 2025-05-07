rio-pmtiles
===========

A plugin for the
`Rasterio CLI <https://github.com/rasterio/rasterio/blob/main/docs/cli.rst>`__
that exports a raster dataset to the PMTiles (version 3) format. Features
include automatic reprojection and concurrent tile generation.

This is derived from the original rio-mbtiles CLI by Sean Gillies at Mapbox. See CHANGELOG.md for differences.

Usage
-----

.. code-block:: console

    Usage: rio pmtiles [OPTIONS] INPUT [OUTPUT]

      Export a dataset to PMTiles (version 3).

      The input dataset may have any coordinate reference system. It must have
      at least three bands, which will be become the red, blue, and green bands
      of the output image tiles.

      An optional fourth alpha band may be copied to the output tiles by using
      the --rgba option in combination with the PNG or WEBP formats. This option
      requires that the input dataset has at least 4 bands.

      The default quality for JPEG and WEBP output (possible range: 10-100) is
      75. This value can be changed with the use of the QUALITY creation option,
      e.g. `--co QUALITY=90`.  The default zlib compression level for PNG output
      (possible range: 1-9) is 6. This value can be changed like `--co
      ZLEVEL=8`.  Lossless WEBP can be chosen with `--co LOSSLESS=TRUE`.

      If no zoom levels are specified, the defaults are the zoom levels nearest
      to the one at which one tile may contain the entire source dataset.

      If a title or description for the output file are not provided, they will
      be taken from the input dataset's filename.

      This command is suited for small to medium (~1 GB) sized sources.

      Python package: rio-pmtiles (https://github.com/protomaps/PMTiles).

    Options:
      -o, --output PATH               Path to output file (optional alternative to
                                      a positional arg).

      --name TEXT                     PMTiles metadata name.
      --description TEXT              PMTiles metadata description.
      --attribution TEXT              PMTiles metadata attribution.
      --overlay                       Export as an overlay (the default).
      --baselayer                     Export as a base layer.
      -f, --format [JPEG|PNG|WEBP]    Tile image format.  [default: WEBP]
      --tile-size INTEGER             Width and height of individual square tiles
                                      to create.  [default: 512]

      --zoom-levels MIN..MAX          A min...max range of export zoom levels. The
                                      default zoom level is the one at which the
                                      dataset is contained within a single tile.

      -j INTEGER                      Number of workers (default: number of
                                      computer's processors).

      --src-nodata FLOAT              Manually override source nodata
      --dst-nodata FLOAT              Manually override destination nodata
      --resampling [nearest|bilinear|cubic|cubic_spline|lanczos|average|mode|gauss|max|min|med|q1|q3|rms]
                                      Resampling method to use.  [default:
                                      bilinear]

      --version                       Show the version and exit.
      --rgba                          Select RGBA output. For PNG or WEBP only.

      -#, --progress-bar              Display progress bar.
      --cutline PATH                  Path to a GeoJSON FeatureCollection to be
                                      used as a cutline. Only source pixels within
                                      the cutline features will be exported.

      --oo NAME=VALUE                 Format driver-specific options to be used
                                      when accessing the input dataset. See the
                                      GDAL format driver documentation for more
                                      information.

      --co, --profile NAME=VALUE      Driver specific creation options. See the
                                      documentation for the selected output driver
                                      for more information.

      --wo NAME=VALUE                 See the GDAL warp options documentation for
                                      more information.

      --exclude-empty-tiles / --include-empty-tiles
                                      Whether to exclude or include empty tiles
                                      from the output.

      --help                          Show this message and exit.

Performance
-----------

The rio-pmtiles command is suited for small to medium (~1 GB) raster sources.
On a MacBook Pro M1, the 1:10M scale Natural Earth raster
(a 21,600 x 10,800 pixel, 700 MB TIFF) exports to PMTiles (levels 1 through 5)
in 15 seconds.

.. code-block:: console

    $ time GDAL_CACHEMAX=256 rio pmtiles NE1_HR_LC.tif \
    > -o ne.pmtiles --zoom-levels 1..5 -j 4

    14.87s user 10.40s system 258% cpu 9.787 total

Installation
------------

``pip install rio-pmtiles``
