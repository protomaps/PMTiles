# PMTiles Version 3 Specification

## 1 Introduction

PMTiles is a single-file archive of square tiles.

## 2 Overview

A archive consist of five main sections:

1. A fixed-size 127-byte header (described in [chapter 3](#3-header))
1. A root directory (described in [chapter 4](#4-directories))
1. Optional JSON metadata (described in [chapter 5](#5-json-metadata))
1. Optional leaf directories (described in [chapter 4](#4-directories))
1. The actual tile data.

These sections are normally in the same order as in the list above, but theoretically it is possible to relocate all sections other than the header arbitrarily.
The only restriction is that the root directory must be contained in the first 16,384 bytes (16 KB) of the archive so that latency-optimized clients can retrieve the root directory in advance and ensure that it is complete.

## 3 Header

The Header has a length of 127 bytes and is always at the start of the archive. It includes the most important metadata and everything needed to decode the rest of the PMTiles archive properly.

### 3.1 Overview
```
Offset     00   01   02   03   04   05   06   07   08   09   0A   0B   0C   0D   0E   0F
         +----+----+----+----+----+----+----+----+----+----+----+----+----+----+----+----+
000000   |           Magic Number           |  V |         Root Directory Offset         |
         +----+----+----+----+----+----+----+----+----+----+----+----+----+----+----+----+
000010   |         Root Directory Length         |            Metadata Offset            |
         +----+----+----+----+----+----+----+----+----+----+----+----+----+----+----+----+
000020   |            Metadata Length            |        Leaf Directories Offset        |
         +----+----+----+----+----+----+----+----+----+----+----+----+----+----+----+----+
000030   |        Leaf Directories Length        |            Tile Data Offset           |
         +----+----+----+----+----+----+----+----+----+----+----+----+----+----+----+----+
000040   |            Tile Data Length           |         Num of Addressed Tiles        |
         +----+----+----+----+----+----+----+----+----+----+----+----+----+----+----+----+
000050   |         Number of Tile Entries        |        Number of Tile Contents        |
         +----+----+----+----+----+----+----+----+----+----+----+----+----+----+----+----+
000060   |  C | IC | TC | TT |MinZ|MaxZ|              Min Position             |      Max 
         +----+----+----+----+----+----+----+----+----+----+----+----+----+----+----+----+
000070    Position                     |CenZ|            Center Position            |
         +----+----+----+----+----+----+----+----+----+----+----+----+----+----+----+
```

### 3.2 Fields
#### Magic Number

The magic number is a fixed 7-byte field whose value is always `PMTiles` in UTF-8 encoding (`0x50 0x4D 0x54 0x69 0x6C 0x65 0x73`)

#### Version (V)

The version is a fixed 1-byte field whose value is always 3 (`0x03`).

#### Root Directory Offset

The Root Directory Offset is a 8-byte field whose value gives the offset of the first byte of the root directory. This address offset is relative to the first byte of the archive.

This field is encoded as an little-endian 64-bit unsigned integer.

#### Root Directory Length

The Root Directory Length is a 8-byte field specifying the number of bytes in the root directory.

This field is encoded as an little-endian 64-bit unsigned integer.

#### Metadata Offset

The Metadata Offset is a 8-byte field whose value gives the offset of the first byte of the metadata. This address offset is relative to the first byte of the archive.

This field is encoded as an little-endian 64-bit unsigned integer.

#### Metadata Length

The Metadata Length is a 8-byte field specifying the number of bytes reserved for the metadata. A value `0` indicates that there is no metadata included in this PMTiles archive.

This field is encoded as an little-endian 64-bit unsigned integer.

#### Leaf Directories Offset

The Leaf Directories Offset is a 8-byte field whose value gives the offset of the first byte of the leaf directories. This address offset is relative to the first byte of the archive.

This field is encoded as an little-endian 64-bit unsigned integer.

#### Leaf Directories Length

The Leaf Directories Length is a 8-byte field specifying the number of bytes reserved for leaf directories. A value `0` indicates that there are no leaf directories included in this PMTiles archive.

This field is encoded as an little-endian 64-bit unsigned integer.

#### Tile Data Offset

The Tile Data Offset is a 8-byte field whose value gives the offset of the first byte of the tile data. This address offset is relative to the first byte of the archive.

This field is encoded as an little-endian 64-bit unsigned integer.

#### Tile Data Length

The Tile Data Length is a 8-byte field specifying the number of bytes reserved for the tile data.

This field is encoded as an little-endian 64-bit unsigned integer.

#### Number of Addressed Tiles

The Number of Addressed Tiles is a 8-byte field specifying the total number of tiles, which are addressable in the PMTiles archive (before Run-Length encoding).

A value of `0` indicates that the number is unknown.

This field is encoded as an little-endian 64-bit unsigned integer.

#### Number of Tile Entries

The Number of Tile Entries is a 8-byte field specifying the total number of tile-entries (_Run-Length_ is greater 0).

A value of `0` indicates that the number is unknown.

This field is encoded as an little-endian 64-bit unsigned integer.

#### Number of Tile Contents

The Number of Tile Contents is a 8-byte field specifying the total number of blobs in the tile data section.

A value of `0` indicates that the number is unknown.

This field is encoded as an little-endian 64-bit unsigned integer.

#### Clustered (C)

Clustered is a 1-byte field specifying if the data of the individual tiles in the data section are order by their Tile-ID (clustered) or not (not clustered).

Clustered means, that offsets are either contiguous with the previous offset+length, or refer to a lesser offset, when writing with deduplication.

The field can be one of the following values:

| Value  | Meaning       |
| :----- | :------------ |
| `0x00` | Not clustered |
| `0x01` | Clustered     |

#### Internal Compression (IC)

The Internal Compression is a 1-byte field specifying the compression of the root directory, metadata as well as all leaf directories.

The encoding of this field is described in [chapter 3.3](#33-compression).

#### Tile Compression (TC)

The Tile Compression is a 1-byte field specifying the compression of all tiles.

The encoding of this field is described in [chapter 3.3](#33-compression).

#### Tile Type (TT)

The Tile Type is a 1-byte field specifying the type of tiles.

The field can be one of the following values:

| Value  | Meaning            |
| :----- | :----------------- |
| `0x00` | Unknown / Other    |
| `0x01` | Mapbox Vector Tile |
| `0x02` | PNG                |
| `0x03` | JPEG               |
| `0x04` | WebP               |

#### Min Zoom (MinZ)

The Min Zoom is a 1-byte field specifying minimum zoom (LOD) of the tiles.

This field is encoded as an 8-bit unsigned integer.

#### Max Zoom (MaxZ)

The Max Zoom is a 1-byte field specifying maximum zoom (LOD) of the tiles.

This field is encoded as an 8-bit unsigned integer.

#### Min Position

The Min Position is a 8-byte field including the minimum latitude and minimum longitude of the bounds.

The encoding of this field is described in [chapter 3.4](#34-position).

#### Max Position

The Max Position is a 8-byte field including the maximum latitude and maximum longitude of the bounds.

The encoding of this field is described in [chapter 3.4](#34-position).

#### Center Zoom (CZ)

The Center Zoom is a 1-byte field specifying center zoom (LOD) of the tiles. A reader may use this as the initial zoom, when displaying tiles from the PMTiles archive.

This field is encoded as an 8-bit unsigned integer.

#### Center Position

The Center Position is a 8-byte field including the latitude and longitude of the center position. A reader may use this as the initial center position, when displaying tiles from the PMTiles archive.

The encoding of this field is described in [chapter 3.4](#34-position).

### 3.3 Compression

Compression is a enum with the following values:

| Value  | Meaning |
| :----- | :------ |
| `0x00` | Unknown |
| `0x01` | None    |
| `0x02` | GZip    |
| `0x03` | Brotli  |
| `0x04` | ZStd    |

### 3.4 Position

A Position is encoded into 8 bytes. Bytes 0 through 3 (first 4 bytes) represent the latitude and byte 4 through 7 (last 4 bytes) represent the longitude.

#### Encoding

To encode a latitude or a longitude into 4 bytes use the following method:

1. Multiply value by 10,000,000
1. Convert result into little-endian 32-bit signed integer

#### Decoding

To decode a latitude or a longitude from 4 bytes use the following method:

1. Read bytes as a little-endian 32-bit signed integer
1. Divide read value by 10,000,000

## 4 Directories

A directory is simply a list of entries. Each entry describes either where a specific tile can be found in the _tile data section_, or where a leaf directory can be found in the _leaf directories section_.  

The number of entries in the root directory and in the leaf directories is left to the implementation and can vary drastically depending on what the writer has optimized for (cost, bandwidth, latency etc.).  
However, the size of the header plus the compressed size of the root directory must not exceed 16384 bytes to allow latency-optimized clients to retrieve the root directory in its entirety. Therefore, the **maximum compressed size of the root directory is 16257 bytes** (16384 bytes - 127 bytes). A sophisticated writer might need several attempts to optimize this.

### 4.1 Directory Entries

Each directory entry consists of the following properties:
- Tile ID
- Offset
- Length
- Run-Length

#### Tile-ID
Specifies the ID of the tile / the first tile in the leaf directory. 

The Tile-ID corresponds to a cumulative position on the series of [Hilbert curves](https://wikipedia.org/wiki/Hilbert_curve) starting at zoom level 0.

|Z|X|Y|TileID|
|--:|--:|--:|--:|
|0|0|0|0|
|1|0|0|1|
|1|0|1|2|
|1|1|0|3|
|1|1|1|4|
|2|0|0|5|
|...
|12|3423|1763|19078479|

#### Offset
Specifies the offset of the first byte of the tile or leaf directory. This address offset is relative to the first byte of the _tile data section_ for tile-entries, and relative to the first byte of the _leaf directories section_ for leaf-directory-entries.

#### Length
Specifies the number of bytes reserved for this tile or leaf directory. This size always indicates the compressed size, if the tile or leaf directory is compressed.

#### Run-Length
Specifies the number of tiles for which this entry is valid. A run length of `0` means that this entry is for a leaf directory and not for a tile.

#### Examples
|Tile-ID|Offset|Length|Run-Length|Description|
|--:|--:|--:|--:|:--|
|`5`|`1337`|`42`|`1`|Tile 5 is located at bytes 1337-1378 of the _tile data section_|
|`5`|`1337`|`42`|`3`|Tile 5, 6 and 7 are located at bytes 1337-1378 of the _tile data section_|
|`5`|`1337`|`42`|`0`|A leaf directory whose first tile has an ID of 5 is located at byte 1337-1378 of the _leaf directories section_|

### 4.2 Encoding
A directory can only be encoded in its entirety. It is not possible to encode a single directory entry by itself. 

[Appendix A.1](#a1-encode-a-directory) includes a pseudo code implementation of encoding a directory.

An encoded directory consists of five parts in the following order:
1. The number of entries contained in the directory
1. Tile-IDs of all entries
1. Run-Lengths of all entries
1. Lengths of all entries
1. Offsets of all entries

#### Number of entries
The number of entries included in this directory.

This field is encoded as an little-endian [variable-width integer](https://protobuf.dev/programming-guides/encoding/#varints).

#### Tile IDs
The Tile-IDs are delta-encoded, i.e. the number to be written is the difference to the last Tile-ID.

For example the Tile-IDs `5`, `42` and `69` would be encoded as `5` (_5 - 0_) `37` (_42 - 5_) and `27` (_69 - 42_).

Each delta-encoded Tile-ID is encoded as an little-endian [variable-width integer](https://protobuf.dev/programming-guides/encoding/#varints).

#### Run-Lengths

The Run-Lengths are simply encoded as is, each as an little-endian [variable-width integer](https://protobuf.dev/programming-guides/encoding/#varints).

#### Lengths

The lengths are simply encoded as is, each as an little-endian [variable-width integer](https://protobuf.dev/programming-guides/encoding/#varints).

#### Offsets
Offsets are encoded either as `Offset + 1` or `0`, if it is equal to the sum of offset and length of the previous entry (tile blobs are contiguous).

Each offset is encoded as an little-endian [variable-width integer](https://protobuf.dev/programming-guides/encoding/#varints).

#### Compression
After encoding, each directory is compressed according to the internal compression field of the header. Leaf directories are compressed separately and not as a whole section.

### 4.3 Decoding

_TODO_

## 5 JSON Metadata

_TODO_

---

## A Pseudo Codes

### A.1 Encode a directory

#### Functions

```
write_var_int(x, y) = write 'y' as a little-endian variable-width integer to 'x'
compress(x) = compress 'x' according to internal compression
```

#### Pseudo Code

```rs
entries = list of entries in this directory
buffer = the output byte-buffer

last_id = 0
for entry in entries {
    write_var_int(buffer, entry.tile_id - last_id)
    last_id = entry.tile_id
}

for entry in entries {
    write_var_int(buffer, entry.run_length)
}

for entry in entries {
    write_var_int(buffer, entry.length)
}

next_byte = 0
for (index, entry) in entries {
    if entry.offset == next_byte {
        write_var_int(buffer, 0)
    } else {
        write_var_int(buffer, entry.offset + 1)
    }
    
    next_byte = entry.offset + entry.length
}

compress(buffer)
```