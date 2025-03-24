1.0.0
------

* output clustered, compressed PMTiles archives only
* require python 3.7 or above
* update dependencies
* remove multiprocessing implementation in favor of concurrent.futures; remove `--implementation` option
* remove quadkey feature
* replace progress estimation with exact counts; add pyroaring dependency
* remove --image-dump feature