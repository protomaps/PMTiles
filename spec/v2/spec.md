# PMTiles version 2

*Note: this is deprecated in favor of spec version 3.*

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