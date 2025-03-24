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