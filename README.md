[![pmtiles npm](https://img.shields.io/npm/v/pmtiles?label=npm%20pmtiles)](https://www.npmjs.com/package/pmtiles)
[![pmtiles pypi](https://img.shields.io/pypi/v/pmtiles?label=pypi%20pmtiles)](https://pypi.org/project/pmtiles/)
[![rio-pmtiles pypi](https://img.shields.io/pypi/v/rio-pmtiles?label=pypi%20rio-pmtiles)](https://pypi.org/project/rio-pmtiles/)
[![ol-pmtiles npm](https://img.shields.io/npm/v/ol-pmtiles?label=npm%20ol-pmtiles)](https://www.npmjs.com/package/ol-pmtiles)

🔎 **PMTiles Viewer:** [https://pmtiles.io/](https://pmtiles.io) 🔎

# PMTiles

PMTiles is a single-file archive format for tiled data. A PMTiles archive can be hosted on a commodity storage platform such as S3, and enables low-cost, zero-maintenance map applications that are "serverless" - free of a custom tile backend or third party provider.

* [PMTiles Viewer](https://pmtiles.io) - inspect and preview PMTiles local or remote PMTiles archives.
    * Archives on cloud storage may require CORS for the origin `https://protomaps.github.io`

* [Documentation]() - for how to create and read PMTiles.

* [How to read PMTiles in Leaflet or MapLibre GL JS]() - for how to create and read PMTiles.

* [Creating PMTiles with Tippecanoe]()

* [Uploading pmtiles using the CLI]() or with [rclone]()

## Examples

* [Vector Tiles Example (US Zip Codes)](https://pmtiles.io/?url=https%3A%2F%2Fr2-public.protomaps.com%2Fprotomaps-sample-datasets%2Fcb_2018_us_zcta510_500k.pmtiles)

## This Repository

### Specification

## Specification

The current specification version is [Version 3](./spec/v3/spec.md).

### Implementations

* Python rio-pmtiles implementation

* Python library

* JavaScript library, for browsers

* MapLibre implementation

* OpenLayers implementation

* Leaflet implementation (Raster)

- for Vector, see protomaps-leaflet

* AWS Lambda implementation

* Cloudflare Workers implementation

- for the pmtiles CLI, see [go-pmtiles](https://github.com/protomaps/go-pmtiles)

## Consuming PMTiles

### Python

See https://github.com/protomaps/PMTiles/tree/main/python/bin for library usage

### Serverless

[PMTiles on AWS Lambda](https://github.com/protomaps/PMTiles/tree/main/serverless/aws)

[PMTiles on Cloudflare Workers](https://github.com/protomaps/PMTiles/tree/main/serverless/cloudflare)

## Recipes

Example of how to create a PMTiles archive from the [Census Bureau Zip Code Tabulation Areas Shapefile](https://www.census.gov/geographies/mapping-files/time-series/geo/carto-boundary-file.html) using [tippecanoe](https://github.com/felt/tippecanoe):

```sh
    # use GDAL/OGR to convert SHP to GeoJSON
    ogr2ogr -t_srs EPSG:4326 cb_2018_us_zcta510_500k.json cb_2018_us_zcta510_500k.shp
    # Creates a layer in the vector tiles named "zcta"
    tippecanoe -zg --projection=EPSG:4326 -o cb_2018_us_zcta510_500k_nolimit.pmtiles -l zcta cb_2018_us_zcta510_500k.json
```

### Uploading to Storage

Using the [PMTiles command line tool](http://github.com/protomaps/go-pmtiles):

```sh
pmtiles upload LOCAL.pmtiles "s3://BUCKET_NAME?endpoint=https://example.com&region=region" REMOTE.pmtiles
```

Using [RClone](https://rclone.org) (do `rclone config` first)

```sh
rclone copyto LOCAL.pmtiles r2:/BUCKET/REMOTE.pmtiles --progress --s3-chunk-size=256M --s3-upload-concurrency=2
```

## License

The reference implementations of PMTiles are published under the BSD 3-Clause License. The PMTiles specification itself is public domain, or under a CC0 license where applicable.
