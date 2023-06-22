# PMTiles version 3

### 3.1
* added `metadata` details about `vector_layers`.
* Clarified that directory entry lengths must be nonzero, and directories must be non-empty.
* add AVIF to TileTypes.

## File structure

A PMTiles archive is a single-file archive of square tiles with five main sections:

1. A fixed-size, 127-byte **Header** starting with `PMTiles` and then the spec version - currently `3` - that contains offsets to the next sections.
2. A root **Directory**, described below. The Header and Root combined must be less than 16,384 bytes.
3. JSON metadata.
4. Optionally, a section of **Leaf Directories**, encoded the same way as the root.
5. The tile data.

## Entries

A Directory is a list of `Entries`, in ascending order by `TileId`:

    Entry = (TileId uint64, Offset uint64, Length uint32, RunLength uint32)

* `TileId` starts at 0 and corresponds to a cumulative position on the series of square Hilbert curves starting at z=0.
* `Offset` is the position of the tile in the file relative to the start of the data section.
*	`Length` is the size of the tile in bytes, **which must be > 0.**
* `RunLength` is how many times this tile is repeated: the `TileId=5,RunLength=2` means that tile is present at IDs 5 and 6.
* If `RunLength=0`, the offset/length points to a Leaf Directory where `TileId` is the first entry.

# Directory Serialization

Entries are stored in memory as integers, but serialized to disk using these compression steps:

1. A little-endian varint indicating the # of entries, **which must be > 0**
2. Delta encoding of `TileId`
3. Zeroing of `Offset`:
	* `0` if it is equal to the `Offset` + `Length` of the previous entry
	* `Offset+1` otherwise
4. Varint encoding of all numbers
5. Columnar ordering: all `TileId`s, all `RunLength`s, all `Length`s, then all `Offset`s
6. Finally, general purpose compression as described by the `Header`'s `InternalCompression` field

# Directory Hierarchy

* The number of entries in the root directory and leaf directories is up to the implementation.
* However, the compressed size of the header plus root directory is required in v3 to be under **16,384 bytes**. This is to allow latency-optimized clients to prefetch the root directory and guarantee it is complete. A sophisticated writer might need several attempts to optimize this. 
* Root size, leaf sizes and depth should be configurable by the user to optimize for different trade-offs: cost, bandwidth, latency.

# Header Design

*Certain fields belonging to metadata in v2 are promoted to fixed-size header fields. This allows a map container to be initialized to the desired extent or center without blocking on the JSON metadata, and allows proxies to return well-defined HTTP headers.*

The `Header` is 127 bytes, with little-endian integer values:

| offset | description | width |
| --- | --- | --- |
| 0 | magic number `PMTiles` | 7 |
| 7 | spec version, currently `3` | 1 |
| 8 | offset of root directory | 8 |
| 16 | length of root directory | 8 |
| 24 | offset of JSON metadata, possibly compressed by `InternalCompression` | 8 |
| 32 | length of JSON metadata | 8 |
| 40 | offset of leaf directories | 8 |
| 48 | length of leaf directories | 8 |
| 56 | offset of tile data | 8 |
| 64 | length of tile data | 8 |
| 72 | # of addressed tiles, 0 if unknown | 8 |
| 80 | # of tile entries, 0 if unknown | 8 |
| 88 | # of tile contents, 0 if unknown | 8 |
| 96 | boolean clustered flag, `0x1` if true | 1 |
| 97 | `InternalCompression` enum (0 = Unknown, 1 = None, 2 = Gzip, 3 = Brotli, 4 = Zstd) | 1 |
| 98 | `TileCompression` enum | 1 |
| 99 | tile type enum (0 = Unknown/Other, 1 = MVT (PBF Vector Tile), 2 = PNG, 3 = JPEG, 4 = WEBP, 5 = AVIF | 1 |
| 100 | min zoom | 1 |
| 101 | max zoom | 1 |
| 102 | min longitude (signed 32-bit integer: longitude * 10,000,000) | 4 |
| 106 | min latitude | 4 |
| 110 | max longitude | 4 |
| 114 | max latitude | 4 |
| 118 | center zoom | 1 |
| 119 | center longitude | 4 |
| 123 | center latitude | 4 |

### Notes

* **# of addressed tiles**: the total number of tiles before run-length encoding, i.e. `Sum(RunLength)` over all entries.
* **# of tile entries**: the total number of entries across all directories where `RunLength > 0`.
* **# # of tile contents**: the number of referenced blobs in the tile section, or the unique # of offsets. If the archive is completely deduplicated, this is equal to the # of unique tile contents. If there is no deduplication, this is equal to the number of tile entries above.
* **boolean clustered flag**: if true, blobs in the data section are ordered by Hilbert `TileId`. When writing with deduplication, this means that offsets are either contiguous with the previous offset+length, or refer to a lesser offset.
* **compression enum**: Mandatory, tells the client how to decompress contents as well as provide correct `Content-Encoding` headers to browsers.
* **tile type**: A hint as to the tile contents. Clients and proxies may use this to:
 	* Automatically determine a visualization method
	* provide a conventional MIME type `Content-Type` HTTP header
	* Enforce a canonical extension e.g. `.mvt`, `png`, `jpeg`, `.webp` to prevent duplication in caches

### Metadata

The JSON metadata is designed to contain arbitrary, application-specific data. However, if the `TileType` is `mvt`, the metadata should contain `vector_layers` as described in the [TileJSON 3.0 spec](https://github.com/mapbox/tilejson-spec/tree/master/3.0.0#1-purpose).

### Organization

In most cases, the archive should be in the order `Header`, Root Directory, JSON Metadata, Leaf Directories, Tile Data. It is possible to relocate sections other than `Header` arbitrarily, but no current writers/readers take advantage of this. A future design may allow for reverse-ordered archives to enable single-pass writing.
