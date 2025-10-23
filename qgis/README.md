# QGIS PMTiles Plugin

- GDAL can't handle raster PMTiles as of yet (last checked 23/10/2025).
- As a consequence QGIS does not have support for reading or writing
  raster PMTile files.
- This plugin is an interim solution to convert MBTiles file into
  PMTiles, using the official Python package.
- It bundles a vendored `pmtiles` Python package inside the plugin.

## Testing ogr2ogr & GDAL

```bash
ogr2ogr -if "MBTiles" info ./myfile.mbtiles --debug on

# Results in:
# SQLite: 1 features read on layer 'SELECT'.
# SQLite: 8 features read on layer 'SELECT'.
# MBTiles: This files contain raster tiles, but driver open in vector-only mode
# ERROR 1: Unable to open datasource `./bing_basemap.mbtiles' with the following drivers.

# Can't read mbtiles, so no pmtiles conversion
```

```bash
gdal convert --input myfile.mbtiles --output myfile.pmtiles --output-format "PMTiles"

# Results in:
# ERROR 1: convert: Invalid value for argument 'output-format'. Driver 'PMTiles' does not expose the required 'DCAP_RASTER' capability.
```

## Options available

- Tippecanoe (too heavy to bundle in QGIS / may cause licensing issues).
- go-pmtiles (hard to bundle different OS binaries in a plugin).
- Direct Python library usage (this plugin).

> ![NOTE]
> The `go-pmtiles` binary is much more efficient than the Python library.
>
> If we find an elegant solution for bundling the binary inside the
> QGIS Plugin, that could be considered too.
>
> Alternatively, I assume the C++ code in this repo could be used
> to make a C++ plugin for QGIS too.

## Releasing

```bash
uv sync
uv run python package.py
```

## Linting

```bash
uv sync
uv run ruff format
uv run ruff check
```
