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
* A single directory is sorted and serialized using the following 5 compression steps:
	1. A header varint storing the # of entries in the directory
	2. Run-length encoding of consecutive identical entries
	3. Delta encoding of `TileId`
	4. Encoding of `Offset`:
		* `0` if it is equal to the `Offset` + `Length` of the previous entry
		* `Offset+1` otherwise
	5. Varint encoding of `TileId`, `Offset`, `Length` and `RunLength`
	6. Columnar organization: all `TileId`s, all `RunLength`s, all `Length`s, then all `Offset`s
	7. Finally, general purpose compression: usually `gzip`

# Directory Hierarchy
* The number of entries in the root directory and leaf directories is up to the implementation.
* However, the compressed size of the header plus root directory is recommended to be under **16384 bytes**. This is to allow latency-optimized clients to prefetch the root directory and guarantee it is complete. A sophisticated writer might need several attempts to optimize this. Otherwise, there is no limit to the size of the root directory.
* Root size, leaf sizes and depth should be configurable by the user to adjust for optimize for different trade-offs: cost, bandwidth, latency.

# Header Design

*Certain fields belonging to metadata in v2 are promoted to fixed-size header fields. This allows a map container to be initialized to the desired extent or center without blocking on the JSON metadata.*

fixed-width 152-byte header

| offset | description | width |
| --- | --- | --- |
| 0 | magic number PM | 2 |
| 2 | spec version, currently `3` | 1 |
| 3 | offset of root directory | 8 |
| 11 | length of root directory | 8 |
| 19 | offset of JSON metadata | 8 |
| 27 | length of JSON metadata | 8 |
| 35 | offset of leaf directories | 8 |
| 43 | length of leaf directories | 8 |
| 51 | offset of tile data | 8 |
| 59 | length of tile data | 8 |
| 67 | # of addressed tiles[^1], 0 if unknown | 8 |
| 75 | # of tile entries[^2], 0 if unknown | 8 |
| 83 | # of tile contents[^3], 0 if unknown | 8 |
| 91 | boolean clustered[^4] flag | 1 |
| 92 | length of directory compression string | 1 |
| 93 | directory compression string | 10 |
| 103 | length of tile compression string | 1 |
| 104 | tile compression string (`gzip`,`br`,`zstd`, etc.) | 10 |
| 114 | length of tile format string | 1 |
| 115 | tile format string (`pbf`, `png`, `jpg`, etc.) | 10 |
| 125 | min zoom | 1 |
| 126 | max zoom | 1 |
| 127 | min longitude (IEEE 754 float) | 4 |
| 131 | min latitude | 4 |
| 135 | max longitude | 4 |
| 139 | max latitude | 4 |
| 143 | center zoom | 1 |
| 144 | center longitude | 4 |
| 148 | center latitude | 4 |


The archive SHOULD contain this 152-byte header, then the header directory, then the JSON metadata, then the leaf directories (if present), then all tile data.

## Clustered archives

If the `clustered` header is `True`, this means that the tile data in the data section are generally ordered by TileID (Hilbert order). More concretely, this means that: when traversing all entries in TileID order, the offsets are either contiguous with the immediately previous entry, or refer to a lesser offset (a deduplicated tile).
