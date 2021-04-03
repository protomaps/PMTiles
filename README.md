# PMTiles

PMTiles is a single-file archive format for tiled data. A PMTiles archive can be hosted on a commodity storage platform such as S3, and enables low-cost, zero-maintenance map applications that are "serverless" - free of a custom tile backend or third party provider.

[Demo](https://protomaps.github.io/PMTiles/examples/leaflet.html) - watch your network request log

See also:
* [Cloud Optimized GeoTIFFs](https://www.cogeo.org)

## How To Use

Python library: `pip install pmtiles`

    pmtiles-convert TILES.mbtiles TILES.pmtiles
    pmtiles-convert TILES.pmtiles DIRECTORY
    pmtiles-show TILES.pmtiles // see info about a PMTiles directory
    pmtiles-serve TILES.pmtiles // start an HTTP server that decodes PMTiles into traditional Z/X/Y paths

See https://github.com/protomaps/PMTiles/tree/master/python/bin for library usage

JavaScript usage:

Include the script:

    <script src="https://unpkg.com/pmtiles@0.0.4/pmtiles.js"></script>

Example of a raster PMTiles archive decoded and displayed in Leaflet:

    const p = new pmtiles.PMTiles('osm_carto.pmtiles',{allow_200:true})
    p.leafletLayer({attribution:'© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'}).addTo(map)
    
## Specification

A detailed specification is forthcoming. PMTiles is a binary serialization format designed for two main access patterns: over the network, via HTTP 1.1 Byte Serving (`Range:` requests), or via memory-mapped files on disk.

### Design considerations
* Directories are recursive, with a maximum of 21,845 entries per directory.
  * *21845 is the total tiles of a pyramid with 8 levels, or 1+4+16+64+256+1024+4096+16384*
* Deduplication of tile data is handled by multiple entries pointing to the same offset in the archive.
* The order of tile data in the archive is unspecified; an optimized implementation should arrange tiles on a 2D space-filling curve. 

### Details
* The first 512,000 bytes of a PMTiles archive are reserved, and contain the headers as well as a root directory.
* All integer values are little-endian.
* The headers begin with a 2-byte magic number, "PM"
* 2 bytes: the PMTiles specification version, right now always 1.
* 4 bytes: the length of metadata (M bytes)
* 2 bytes: the number of entries in the root directory (N)
* M bytes: the metadata, by convention a JSON object.
* N * 17 bytes: the root directory.

### Directory structure

A directory is a sequence of 17 byte entries. An entry consists of:
* 1 byte: the zoom level (Z) of the entry, with the top bit set to 1 instead of 0 to indicate the data is a child directory, not tile content.
* 3 bytes: the X (column) of the entry.
* 3 bytes: the Y (row) of the entry.
* 6 bytes: the offset of where the data begins in the archive.
* 4 bytes: the length of the data.

## License

The reference implementations of PMTiles are published under the BSD 3-Clause License. The PMTiles specification itself is public domain, or under a CC0 license where applicable.
