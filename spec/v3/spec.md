# PMTiles Version 3 Specification

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC 2119](https://www.ietf.org/rfc/rfc2119.txt).

---

Please refer to the [change log](./CHANGELOG.md) for a documentation of changes to this specification.

## 1 Abstract

PMTiles is a single-file archive format for tiled data.

The recommended MIME Type for PMTiles is `application/vnd.pmtiles`.

## 2 Overview

A PMTiles archive consists of five main sections:

1. A fixed-size 127-byte header (described in [Chapter 3](#3-header))
1. A root directory (described in [Chapter 4](#4-directories))
1. JSON metadata (described in [Chapter 5](#5-json-metadata))
1. Optional leaf directories (described in [Chapter 4](#4-directories))
1. The actual tile data

These sections are normally in the same order as in the list above, but it is possible to relocate all sections other than the header arbitrarily.
The only two restrictions are that the header is at the start of the archive, and the root directory MUST be contained in the first 16,384 bytes (16 KiB) so that latency-optimized clients can retrieve the root directory in advance and ensure that it is complete.

```
           Root Directory   Metadata    Leaf Directories   Tile Data
               Length        Length          Length         Length
          <--------------> <--------> <----------------> <--------->
+--------+----------------+----------+------------------+-----------+
|        |                |          |                  |           |
| Header | Root Directory | Metadata | Leaf Directories | Tile Data |
|        |                |          |                  |           |
+--------+----------------+----------+------------------+-----------+
         ^                ^          ^                  ^
     Root Dir         Metadata   Leaf Dirs          Tile Data
      Offset           Offset      Offset             Offset
```

## 3 Header

The Header has a length of 127 bytes and is always at the start of the archive. It includes everything needed to decode the rest of the PMTiles archive properly.

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

The Root Directory Offset is an 8-byte field whose value gives the offset of the first byte of the root directory. This address offset is relative to the first byte of the archive.

This field is encoded as a little-endian 64-bit unsigned integer.

#### Root Directory Length

The Root Directory Length is an 8-byte field specifying the number of bytes in the root directory.

This field is encoded as a little-endian 64-bit unsigned integer.

#### Metadata Offset

The Metadata Offset is an 8-byte field whose value gives the offset of the first byte of the metadata. This address offset is relative to the first byte of the archive.

This field is encoded as a little-endian 64-bit unsigned integer.

#### Metadata Length

The Metadata Length is an 8-byte field specifying the number of bytes of metadata.

This field is encoded as a little-endian 64-bit unsigned integer.

#### Leaf Directories Offset

The Leaf Directories Offset is an 8-byte field whose value gives the offset of the first byte of the leaf directories. This address offset is relative to the first byte of the archive.

This field is encoded as a little-endian 64-bit unsigned integer.

#### Leaf Directories Length

The Leaf Directories Length is an 8-byte field specifying the accumulated size (in bytes) of all leaf directories. A value of `0` indicates that there are no leaf directories included in this PMTiles archive.

This field is encoded as a little-endian 64-bit unsigned integer.

#### Tile Data Offset

The Tile Data Offset is an 8-byte field whose value gives the offset of the first byte of the tile data. This address offset is relative to the first byte of the archive.

This field is encoded as a little-endian 64-bit unsigned integer.

#### Tile Data Length

The Tile Data Length is an 8-byte field specifying the accumulated size (in bytes) of all tiles in the tile data section.

This field is encoded as a little-endian 64-bit unsigned integer.

#### Number of Addressed Tiles

The Number of Addressed Tiles is an 8-byte field specifying the total number of tiles in the PMTiles archive, before RunLength Encoding.

A value of `0` indicates that the number is unknown.

This field is encoded as a little-endian 64-bit unsigned integer.

#### Number of Tile Entries

The Number of Tile Entries is an 8-byte field specifying the total number of tile entries: entries where _RunLength_ is greater than 0.

A value of `0` indicates that the number is unknown.

This field is encoded as a little-endian 64-bit unsigned integer.

#### Number of Tile Contents

The Number of Tile Contents is an 8-byte field specifying the total number of blobs in the tile data section.

A value of `0` indicates that the number is unknown.

This field is encoded as a little-endian 64-bit unsigned integer.

#### Clustered (C)

Clustered is a 1-byte field specifying if the data of the individual tiles in the data section is ordered by their TileID (clustered) or not (not clustered).
Therefore, Clustered means that:

* offsets are either contiguous with the previous offset+length, or refer to a lesser offset when writing with deduplication.
* the first tile entry in the directory has offset 0.

The field can have one of the following values:

| Value  | Meaning       |
| :----- | :------------ |
| `0x00` | Not clustered |
| `0x01` | Clustered     |

#### Internal Compression (IC)

The Internal Compression is a 1-byte field specifying the compression of the root directory, metadata, and all leaf directories.

The encoding of this field is described in [Chapter 3.3](#33-compression).

#### Tile Compression (TC)

The Tile Compression is a 1-byte field specifying the compression of all tiles.

The encoding of this field is described in [Chapter 3.3](#33-compression).

#### Tile Type (TT)

The Tile Type is a 1-byte field specifying the type of tiles.

The field can have one of the following values:

| Value  | Meaning            |
| :----- | :----------------- |
| `0x00` | Unknown / Other    |
| `0x01` | MVT Vector Tile    |
| `0x02` | PNG                |
| `0x03` | JPEG               |
| `0x04` | WebP               |
| `0x05` | AVIF               |

#### Min Zoom (MinZ)

The Min Zoom is a 1-byte field specifying the minimum zoom of the tiles.

This field is encoded as an 8-bit unsigned integer.

#### Max Zoom (MaxZ)

The Max Zoom is a 1-byte field specifying the maximum zoom of the tiles. It must be greater than or equal to the min zoom.

This field is encoded as an 8-bit unsigned integer.

#### Min Position

The Min Position is an 8-byte field that includes the minimum latitude and minimum longitude of the bounds.

The encoding of this field is described in [Chapter 3.4](#34-position).

#### Max Position

The Max Position is an 8-byte field including the maximum latitude and maximum longitude of the bounds.

The encoding of this field is described in [Chapter 3.4](#34-position).

#### Center Zoom (CZ)

The Center Zoom is a 1-byte field specifying the center zoom (LOD) of the tiles. A reader MAY use this as the initial zoom when displaying tiles from the PMTiles archive.

This field is encoded as an 8-bit unsigned integer.

#### Center Position

The Center Position is an 8-byte field that includes the latitude and longitude of the center position. A reader MAY use this as the initial center position when displaying tiles from the PMTiles archive.

The encoding of this field is described in [Chapter 3.4](#34-position).

### 3.3 Compression

Compression is an enum with the following values:

| Value  | Meaning |
| :----- | :------ |
| `0x00` | Unknown |
| `0x01` | None    |
| `0x02` | gzip    |
| `0x03` | brotli  |
| `0x04` | zstd    |

### 3.4 Position

A Position is encoded into 8 bytes. Bytes 0 through 3 (the first 4 bytes) represent the longitude, and bytes 4 through 7 (the last 4 bytes) represent the latitude.

#### Encoding

To encode a latitude or a longitude into 4 bytes, use the following method:

1. Multiply the value by 10,000,000.
1. Convert the result into a little-endian 32-bit signed integer.

#### Decoding

To decode a latitude or a longitude from 4 bytes, use the following method:

1. Read bytes as a little-endian 32-bit signed integer.
1. Divide the read value by 10,000,000.

## 4 Directories

A directory is simply a list of entries. Each entry describes either where a specific tile can be found in the _tile data section_ or where a leaf directory can be found in the _leaf directories section_.  

The number of entries in the root directory and in the leaf directories is left to the implementation and can vary depending on what the writer has optimized for (cost, bandwidth, latency, etc.).
However, the size of the header plus the compressed size of the root directory MUST NOT exceed 16384 bytes to allow latency-optimized clients to retrieve the root directory in its entirety. Therefore, the **maximum compressed size of the root directory is 16257 bytes** (16384 bytes - 127 bytes). A sophisticated writer might need several attempts to optimize this.

The order of leaf directories SHOULD be ascending by starting TileID.

It is discouraged to create an archive with more than one level of leaf directories. If you are implementing a writer and discover this need, please open an issue.

### 4.1 Directory Entries

Each directory entry consists of the following properties:
- TileID
- Offset
- Length
- RunLength

#### TileID
Specifies the ID of the tile or the first tile in the leaf directory. 

The TileID corresponds to a cumulative position on the series of [Hilbert curves](https://wikipedia.org/wiki/Hilbert_curve) starting at zoom level 0.

|Z|X|Y|TileID|
|--:|--:|--:|--:|
|0|0|0|0|
|1|0|0|1|
|1|0|1|2|
|1|1|1|3|
|1|1|0|4|
|2|0|0|5|
|...
|12|3423|1763|19078479|

#### Offset
Specifies the offset of the first byte of the tile or leaf directory. This address offset is relative to the first byte of the _tile data section_ for tile entries and relative to the first byte of the _leaf directories section_ for leaf directory entries.

#### Length
Specifies the number of bytes of this tile or leaf directory. This size always indicates the compressed size, if the tile or leaf directory is compressed. The length MUST be greater than 0.

#### RunLength
Specifies the number of tiles for which this entry is valid. A run length of `0` means that this entry is for a leaf directory and not for a tile.

#### Examples
|TileID|Offset|Length|RunLength|Description|
|--:|--:|--:|--:|:--|
|`5`|`1337`|`42`|`1`|Tile 5 is located at bytes 1337–1378 of the _tile data section_.|
|`5`|`1337`|`42`|`3`|Tiles 5, 6, and 7 are located at bytes 1337–1378 of the _tile data section_.|
|`5`|`1337`|`42`|`0`|A leaf directory whose first tile has an ID of 5 is located at byte 1337–1378 of the _leaf directories section_.|

### 4.2 Encoding
A directory can only be encoded in its entirety. It is not possible to encode a single directory entry by itself. 

[Appendix A.1](#a1-encode-a-directory) includes a pseudocode implementation of encoding a directory.

An encoded directory consists of five parts in the following order:
1. The number of entries contained in the directory (MUST be greater than 0)
1. TileIDs of all entries
1. RunLengths of all entries
1. Lengths of all entries
1. Offsets of all entries

#### Number of entries
The number of entries included in this directory.

This field is encoded as a little-endian [variable-width integer](https://protobuf.dev/programming-guides/encoding/#varints).

#### TileIDs
The TileIDs are delta-encoded, i.e., the number to be written is the difference to the last TileID.

For example, the TileIDs `5`, `42`, and `69` would be encoded as `5` (_5 - 0_), `37` (_42 - 5_), and `27` (_69 - 42_).

Each delta-encoded TileID is encoded as a little-endian [variable-width integer](https://protobuf.dev/programming-guides/encoding/#varints).

#### RunLengths

The RunLengths are simply encoded as is, each as a little-endian [variable-width integer](https://protobuf.dev/programming-guides/encoding/#varints).

#### Lengths

The lengths are simply encoded as is, each as a little-endian [variable-width integer](https://protobuf.dev/programming-guides/encoding/#varints). Each length MUST be greater than 0.

#### Offsets
Offsets are encoded either as `Offset + 1` or `0`, if they are equal to the sum of offset and length of the previous entry (tile blobs are contiguous).

Each offset is encoded as a little-endian [variable-width integer](https://protobuf.dev/programming-guides/encoding/#varints).

#### Compression
After encoding, each directory is compressed according to the internal compression field of the header. Leaf directories are compressed individually and not as a whole section.

### 4.3 Decoding

Decoding a directory works similarly to encoding, but in reverse. [Appendix A.2](#a2-decode-a-directory) includes a pseudocode implementation of decoding a directory. The basic steps are the following:
1. Decompress the data according to the internal compression.
1. Read a [variable-width integer](https://protobuf.dev/programming-guides/encoding/#varints) indicating how many entries are included in the directory (let's call this `n`).
1. Read `n` number of [variable-width integers](https://protobuf.dev/programming-guides/encoding/#varints), which are the delta-encoded TileIDs of all entries. _¹_
1. Read `n` number of [variable-width integers](https://protobuf.dev/programming-guides/encoding/#varints), which are the RunLengths of all entries.
1. Read `n` number of [variable-width integers](https://protobuf.dev/programming-guides/encoding/#varints), which are the Lengths of all entries.
1. Read `n` number of [variable-width integers](https://protobuf.dev/programming-guides/encoding/#varints), which are the Offsets of all entries. _¹_

_¹ Please refer to [Section 4.2](#42-encoding) for details on how Tile ID and Offset are encoded._

## 5 JSON Metadata

The metadata section MUST contain a valid JSON object encoded in UTF-8, which MAY include additional metadata related to the tileset that is not already covered in the header section.

If the [Tile Type](#tile-type-tt) in the header has a value of _MVT Vector Tile_, the object SHOULD contain a key of `vector_layers` as described in the [TileJSON 3.0 specification](https://github.com/mapbox/tilejson-spec/blob/22f5f91e643e8980ef2656674bef84c2869fbe76/3.0.0/README.md#33-vector_layers).

Additionally, this specification defines the following keys, which MAY be included in the object:

|Key|Description|Type|
|--:|--|--|
|`name`|A name describing the tileset|string|
|`description`|A text description of the tileset|string|
|`attribution`|An attribution to be displayed when the map is shown to a user. Implementations MAY decide to treat this as HTML or literal text. |string|
|`type`|The type of the tileset |a string with a value of either `overlay` or `baselayer`|
|`version`|The version number of the tileset|a string containing a valid version according to [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html) |

---

## A Pseudocode

### A.1 Encode a directory

#### Functions

```
write_varint(x, y) = write 'y' as a little-endian variable-width integer to 'x'
compress(x) = compress 'x' according to internal compression
```

#### Pseudocode

```rs
entries = list of entries in this directory
buffer = the output byte-buffer

last_id = 0
for entry in entries {
    write_varint(buffer, entry.tile_id - last_id)
    last_id = entry.tile_id
}

for entry in entries {
    write_varint(buffer, entry.run_length)
}

for entry in entries {
    write_varint(buffer, entry.length)
}

next_byte = 0
for (index, entry) in entries {
    if index > 0 && entry.offset == next_byte {
        write_varint(buffer, 0)
    } else {
        write_varint(buffer, entry.offset + 1)
    }
    
    next_byte = entry.offset + entry.length
}

compress(buffer)
```

### A.2 Decode a directory

#### Functions

```
read_var_int(x) = read little-endian variable-width integer from 'x'
decompress(x) = decompress 'x' according to internal compression
```

#### Pseudocode

```rs
input_buffer = the input byte-buffer

buffer = decompress(input_buffer)

num_entries = read_varint(buffer)

entries = empty list of entries

last_id = 0
for i in num_entries {
    value = read_varint(buffer)
    last_id = last_id + value

    entries[i] = Entry { tile_id: last_id }
}

for i in num_entries {
    entries[i].run_length = read_varint(buffer)
}

for i in num_entries {
    entries[i].length = read_varint(buffer)
}

for i in num_entries {
    value = read_varint(buffer)

    if value == 0 && i > 0 {
        // offset = 0 -> entry is directly after previous entry
        prev_entry = entries[i - 1];

        entries[i].offset = prev_entry.offset + prev_entry.length;
    } else {
        entries[i].offset = value - 1;
    }
}

```
