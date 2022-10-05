# PMTiles

PMTiles is a single-file archive format for tiled data. A PMTiles archive can be hosted on a commodity storage platform such as S3, and enables low-cost, zero-maintenance map applications that are "serverless" - free of a custom tile backend or third party provider.

* [Protomaps Blog: Dynamic Maps, Static Storage](http://protomaps.com/blog/dynamic-maps-static-storage)

* [PMTiles Inspector](https://protomaps.github.io/PMTiles/) - inspect and preview PMTiles local or remote PMTiles archives. Archives on cloud storage may require CORS for the origin https://protomaps.github.io.

* [Raster Tiles Demo (OSM Carto)](https://protomaps.github.io/PMTiles/?url=https%3A%2F%2Fprotomaps-static.sfo3.digitaloceanspaces.com%2Fosm_carto.pmtiles)

* [Vector Tiles Example (US Zip Codes)](https://protomaps.github.io/PMTiles/?url=https%3A%2F%2Fprotomaps-static.sfo3.digitaloceanspaces.com%2Fcb_2018_us_zcta510_500k_nolimit.pmtiles)


Demos require MapLibre GL JS v1.14.1-rc.2 or later

See also:
* [Cloud Optimized GeoTIFFs](https://www.cogeo.org)

## How To Use

### JavaScript

See [js/README.md](js/README.md) for usage in Leaflet or MapLibre GL JS.

### Go

See https://github.com/protomaps/go-pmtiles

### Python

    pip install pmtiles
    pmtiles-convert TILES.mbtiles TILES.pmtiles
    pmtiles-convert TILES.pmtiles DIRECTORY
    pmtiles-show TILES.pmtiles // see info about a PMTiles directory
    pmtiles-serve TILES.pmtiles // start an HTTP server that decodes PMTiles into traditional Z/X/Y paths

See https://github.com/protomaps/PMTiles/tree/master/python/bin for library usage

### Serverless

[PMTiles on AWS Lambda](https://github.com/protomaps/PMTiles/tree/master/serverless/aws)

[PMTiles on Cloudflare Workers](https://github.com/protomaps/PMTiles/tree/master/serverless/cloudflare)

## Specification


## Recipes

Example of how to create a PMTiles archive from the [Census Bureau Zip Code Tabulation Areas Shapefile](https://www.census.gov/geographies/mapping-files/time-series/geo/carto-boundary-file.html) using [tippecanoe](http://github.com/protomaps/tippecanoe) and the `pmtiles-convert` python program:

```sh
    # use GDAL/OGR to convert SHP to GeoJSON
    ogr2ogr -t_srs EPSG:4326 cb_2018_us_zcta510_500k.json cb_2018_us_zcta510_500k.shp
    # Creates a layer in the vector tiles named "zcta"
    tippecanoe -zg --projection=EPSG:4326 --no-tile-compression --no-feature-limit --no-tile-size-limit -o cb_2018_us_zcta510_500k_nolimit.mbtiles -l zcta cb_2018_us_zcta510_500k.json
    pmtiles-convert cb_2018_us_zcta510_500k_nolimit.mbtiles cb_2018_us_zcta510_500k_nolimit.pmtiles
```

For uploading your PMTiles to cloud storage, [rclone](https://rclone.org) is recommended:

```
rclone config
rclone copy my_archive.pmtiles my_destination:my_folder --progress --s3-chunk-size=256M
```

## License

The reference implementations of PMTiles are published under the BSD 3-Clause License. The PMTiles specification itself is public domain, or under a CC0 license where applicable.
