[![npm](https://img.shields.io/npm/v/pmtiles)](https://www.npmjs.com/package/pmtiles)
[![js minzipped size](https://img.shields.io/bundlephobia/minzip/pmtiles)](https://bundlephobia.com/package/pmtiles)
[![pypi](https://img.shields.io/pypi/v/pmtiles)](https://pypi.org/project/pmtiles/)

🔎 **PMTiles Viewer:** [https://protomaps.github.io/PMTiles/](https://protomaps.github.io/PMTiles/) 🔎

# PMTiles

PMTiles is a single-file archive format for tiled data. A PMTiles archive can be hosted on a commodity storage platform such as S3, and enables low-cost, zero-maintenance map applications that are "serverless" - free of a custom tile backend or third party provider.

* [Protomaps Blog: Dynamic Maps, Static Storage](http://protomaps.com/blog/dynamic-maps-static-storage)

* [PMTiles Viewer](https://protomaps.github.io/PMTiles/) - inspect and preview PMTiles local or remote PMTiles archives. 
    * Archives on cloud storage may require CORS for the origin `https://protomaps.github.io`

* [Vector Tiles Example (US Zip Codes)](https://protomaps.github.io/PMTiles/?url=https%3A%2F%2Fr2-public.protomaps.com%2Fprotomaps-sample-datasets%2Fcb_2018_us_zcta510_500k.pmtiles)


Demos require MapLibre GL JS v1.15 or later.

See also:
* [Cloud Optimized GeoTIFFs](https://www.cogeo.org)

## Creating PMTiles

Download the `pmtiles` binary for your system at [go-pmtiles/Releases](https://github.com/protomaps/go-pmtiles/releases).

    pmtiles convert INPUT.mbtiles OUTPUT.pmtiles
    pmtiles upload OUTPUT.mbtiles s3://my-bucket?region=us-west-2 // requires AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY env vars to be set

## Consuming PMTiles

### JavaScript

See [js/README.md](js/README.md) and [js/examples](js/examples) for usage in Leaflet or MapLibre GL JS.

See [openlayers/README.md](openlayers/README.md) for usage in OpenLayers.

### Go

See the [go-pmtiles](https://github.com/protomaps/go-pmtiles) repository.

### Python

See https://github.com/protomaps/PMTiles/tree/main/python/bin for library usage

### Serverless

[PMTiles on AWS Lambda](https://github.com/protomaps/PMTiles/tree/main/serverless/aws)

[PMTiles on Cloudflare Workers](https://github.com/protomaps/PMTiles/tree/main/serverless/cloudflare)

## Specification

The current specification version is [Version 3](./spec/v3/spec.md).

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
