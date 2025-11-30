1.1.0
------
* Compute and use OVERVIEW_LEVEL to read appropriate overviews instead of full resolution by @qchenevier [#601]
* Use nodata=255 for RGBA inputs/outputs to prevent warnings by @qchenevier [#601]

1.0.3
------
* add `pyproject.toml` and switch to `python -m build` for modernized build, resolving naming deprecation

1.0.2
------
* attribution and tileSize in metadata by @roblabs [#570]
* cleanup of requirements/imports

1.0.1
------
* README fixes by @roblabs [#564]

1.0.0
------
* show progress by default, add `--silent` option [#545]
* change defaults from JPEG/256/nearest to WEBP/512/bilinear
* rename title to name
* automatic guessing of maxzoom

0.0.6
------

This is a port of the original rio-mbtiles developed by @sgillies at https://github.com/mapbox/rio-mbtiles.

Differences are:

* output clustered, compressed PMTiles archives instead of MBTiles
* require Python 3.7 or above
* remove `multiprocessing` implementation in favor of `concurrent.futures`; remove `--implementation` option
* remove `--covers` quadkey feature
* replace progress estimation with exact counts; add `pyroaring` dependency
* remove `--image-dump` feature
* remove `--append/--overwrite` since PMTiles is not a database
* update dependencies

Otherwise, the behavior should be the same as `rio-mbtiles` v1.6.0.