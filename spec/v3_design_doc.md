# V3 design

## Entries

* Directory entries are no longer stored as (z,x,y) but instead as a `TileId`.
	* A TileId starts at 0 and corresponds to a cumulative position on the series of square Hilbert curves starting at z=0.
* A Directory entry considers of 24 bytes, sorted by `TileId`, with:
	* The first 8 bytes being the `TileId`.
	* The next 8 bytes being an `Offset` relative to the start of the data section.
	* The next 4 bytes being the `Length` of the data.
	* The next 4 bytes being the `RunLength`: how many times this entry is repeated.
* A `RunLength` >= 1 means the entry points to Tile data.
* a `RunLength` of 0 means the entry points to a leaf directory. the `TileId` of this entry is the first `TileId` in the leaf directory.

*`RunLength` can reduce the total # of entries for a basemap tileset by up to 90% based on the proportion of ocean tiles.*

# Directory Serialization
* The fixed 24-byte entry is how directories will usually be laid out in memory.
* A single directory is serialized using the following 5 compression steps:
	1. A header varint storing the # of entries in the directory
	2. Run-length encoding of consecutive identical entries
	3. Delta encoding of `TileId` and `Offset`
	4. Varint encoding of `TileId`, `Offset` (signed zigzag-encoded), `Length` and `RunLength`
	5. Columnar organization: all `TileId`s, all `Offset`s, all `Length`s then all `RunLengths`
	6. Finally, general purpose compression: usually `gzip`

# Directory Hierarchy
* The number of entries in the root directory and leaf directories is up to the implementation.
* These should be configurable by the user to adjust for optimize for different trade-offs: cost, bandwidth, latency.

# Header Design

*Certain fields belonging to metadata in v2 are promoted to fixed-size header fields. This allows a map container to be initialized to the desired extent or center without blocking on the JSON metadata.*

* Magic number PM (2 bytes)
* Spec version (1 byte)
* Root dir length in bytes (4 bytes)
* JSON Metadata length in bytes (4 bytes)
* No. of tiles addressed by entries (8 bytes)
* No. number of entries (after RLE) (8 bytes)
* No. of unique tiles (8 bytes)
* string that is the index compression method (gzip, br, std) (10 bytes)
* string that is the tile compression method (10 bytes)
* boolean that indicates if the archive is clustered (boolean)
* the format of the of the tiles (pbf, png, jpg...) (10 bytes)
* The minimum zoom (1 byte)
* the maximum zoom (1 byte)
* the minimum longitude (IEEE754 float) (4 bytes)
* the min lat
* the max lon
* the max lat
* the center zoom (optional)
* the center lon
* the center lat

The archive as a whole contains this 83 byte header, then the header directory, then the JSON metadata, then the leaf directories (if present), then all tile data.

## Clustered archives

If the `clustered` header is `True`, this means that the tile data in the data section are generally ordered by TileID (Hilbert order). This enables certain optimized read access patterns, but is not a requirement. (it is impossible for data to 100% ordered while also supporting tile deduplication)
