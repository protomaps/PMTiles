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

Self-contained Lambda ZIP:

[protomaps.github.io/PMTiles/lambda_function.zip](https://protomaps.github.io/PMTiles/lambda_function.zip)

Self-contained Cloudflare Worker:

[protomaps.github.io/PMTiles/worker.js](https://protomaps.github.io/PMTiles/worker.js)

## Specification

![layout](layout.png)

PMTiles is a binary serialization format designed for two main access patterns: over the network, via HTTP 1.1 Byte Serving (`Range:` requests), or via memory-mapped files on disk. **All integer values are little-endian.**

A PMTiles archive is composed of:
* a fixed-size 512,000 byte header section
* Followed by any number of tiles in arbitrary format
* Optionally followed by any number of *leaf directories*

### Header
* The header begins with a 2-byte magic number, "PM"
* Followed by 2 bytes, the PMTiles specification version (currently 2).
* Followed by 4 bytes, the length of metadata (M bytes)
* Followed by 2 bytes, the number of entries in the *root directory* (N entries)
* Followed by M bytes of metadata, which **must be a JSON string with bounds, minzoom and maxzoom properties (new in v2)**
* Followed by N * 17 bytes, the root directory.

### Directory structure
A directory is a contiguous sequence of 17 byte entries. A directory can have at most 21,845 entries. **A directory must be sorted by Z, X and then Y order (new in v2).**

An entry consists of:
* 1 byte: the zoom level (Z) of the entry, with the top bit set to 1 instead of 0 to indicate the offset/length points to a leaf directory and not a tile.
* 3 bytes: the X (column) of the entry.
* 3 bytes: the Y (row) of the entry.
* 6 bytes: the offset of where the tile begins in the archive.
* 4 bytes: the length of the tile, in bytes.

**All leaf directory entries follow non-leaf entries. All leaf directories in a single directory must have the same Z value. (new in v2).**

### Notes
* A full directory of 21,845 entries holds exactly a complete pyramid with 8 levels, or 1+4+16+64+256+1024+4096+16384.
* A PMTiles archive with less than 21,845 tiles should have a root directory and no leaf directories.
* Multiple tile entries can point to the same offset; this is useful for de-duplicating certain tiles, such as an empty "ocean" tile.
* Analogously, multiple leaf directory entries can point to the same offset; this can avoid inefficiently-packed small leaf directories.
* The tentative media type for PMTiles archives is `application/vnd.pmtiles`.

### Implementation suggestions
* PMTiles is designed to make implementing a writer simple. Reserve 512KB, then write all tiles, recording their entry information; then write all leaf directories; finally, rewind to 0 and write the header.
* The order of tile data in the archive is unspecified; an optimized implementation should arrange tiles on a 2D space-filling curve.
* PMTiles readers should cache directory entries by byte offset, not by Z/X/Y. This means that deduplicated leaf directories result in cache hits.

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
