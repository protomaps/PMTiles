import gzip
import io
from enum import Enum
from typing import TypedDict


class Entry:
    __slots__ = ("tile_id", "offset", "length", "run_length")

    def __init__(self, tile_id, offset, length, run_length):
        self.tile_id = tile_id
        self.offset = offset
        self.length = length
        self.run_length = run_length

    def __str__(self):
        return f"id={self.tile_id} offset={self.offset} length={self.length} runlength={self.run_length}"


def rotate(n, x, y, rx, ry):
    if ry == 0:
        if rx != 0:
            x = n - 1 - x
            y = n - 1 - y
        x, y = y, x
    return x, y


def zxy_to_tileid(z, x, y):
    if z > 31:
        raise OverflowError("tile zoom exceeds 64-bit limit")
    if x > (1 << z) - 1 or y > (1 << z) - 1:
        raise ValueError("tile x/y outside zoom level bounds")

    acc = ((1 << (z * 2)) - 1) // 3
    a = z - 1
    while a >= 0:
        s = 1 << a
        rx = s & x
        ry = s & y
        acc += ((3 * rx) ^ ry) << a
        (x, y) = rotate(s, x, y, rx, ry)
        a -= 1
    return acc


def tileid_to_zxy(tile_id):
    z = ((3 * tile_id + 1).bit_length() - 1) // 2
    if z >= 32:
        raise OverflowError("tile zoom exceeds 64-bit limit")
    acc = ((1 << (z * 2)) - 1) // 3
    pos = tile_id - acc
    x = 0
    y = 0
    s = 1
    n = 1 << z
    while s < n:
        rx = (pos // 2) & s
        ry = (pos ^ rx) & s
        (x, y) = rotate(s, x, y, rx, ry)
        x += rx
        y += ry
        pos >>= 1
        s <<= 1
    return (z, x, y)


def find_tile(entries, tile_id):
    m = 0
    n = len(entries) - 1
    while m <= n:
        k = (n + m) >> 1
        c = tile_id - entries[k].tile_id
        if c > 0:
            m = k + 1
        elif c < 0:
            n = k - 1
        else:
            return entries[k]

    if n >= 0:
        if entries[n].run_length == 0:
            return entries[n]
        if tile_id - entries[n].tile_id < entries[n].run_length:
            return entries[n]


def read_varint(b_io):
    shift = 0
    result = 0
    while True:
        raw = b_io.read(1)
        if raw == b"":
            raise EOFError("unexpectedly reached end of varint stream")
        i = ord(raw)
        result |= (i & 0x7F) << shift
        shift += 7
        if not (i & 0x80):
            break
    return result


def write_varint(b_io, i):
    while True:
        towrite = i & 0x7F
        i >>= 7
        if i:
            b_io.write(bytes([towrite | 0x80]))
        else:
            b_io.write(bytes([towrite]))
            break


class Compression(Enum):
    UNKNOWN = 0
    NONE = 1
    GZIP = 2
    BROTLI = 3
    ZSTD = 4


class TileType(Enum):
    UNKNOWN = 0
    MVT = 1
    PNG = 2
    JPEG = 3
    WEBP = 4
    AVIF = 5


def deserialize_directory(buf):
    b_io = io.BytesIO(gzip.decompress(buf))
    entries = []
    num_entries = read_varint(b_io)

    last_id = 0
    for i in range(num_entries):
        tmp = read_varint(b_io)
        entries.append(Entry(last_id + tmp, 0, 0, 0))
        last_id += tmp

    for i in range(num_entries):
        entries[i].run_length = read_varint(b_io)

    for i in range(num_entries):
        entries[i].length = read_varint(b_io)

    for i in range(num_entries):
        tmp = read_varint(b_io)
        if i > 0 and tmp == 0:
            entries[i].offset = entries[i - 1].offset + entries[i - 1].length
        else:
            entries[i].offset = tmp - 1

    return entries


def serialize_directory(entries):
    b_io = io.BytesIO()
    write_varint(b_io, len(entries))

    last_id = 0
    for e in entries:
        write_varint(b_io, e.tile_id - last_id)
        last_id = e.tile_id

    for e in entries:
        write_varint(b_io, e.run_length)

    for e in entries:
        write_varint(b_io, e.length)

    for i, e in enumerate(entries):
        if i > 0 and e.offset == entries[i - 1].offset + entries[i - 1].length:
            write_varint(b_io, 0)
        else:
            write_varint(b_io, e.offset + 1)

    return gzip.compress(b_io.getvalue())


class SpecVersionUnsupported(Exception):
    pass


class MagicNumberNotFound(Exception):
    pass


class HeaderDict(TypedDict):
    version: int
    root_offset: int
    root_length: int
    metadata_offset: int
    metadata_length: int
    leaf_directory_offset: int
    leaf_directory_length: int
    tile_data_offset: int
    tile_data_length: int
    addressed_tiles_count: int
    tile_entries_count: int
    tile_contents_count: int
    clustered: bool
    internal_compression: Compression
    tile_compression: Compression
    tile_type: TileType
    min_zoom: int
    max_zoom: int
    min_lon_e7: int
    min_lat_e7: int
    max_lon_e7: int
    max_lat_e7: int
    center_zoom: int
    center_lon_e7: int
    center_lat_e7: int


def deserialize_header(buf) -> HeaderDict:
    if buf[0:7].decode() != "PMTiles":
        raise MagicNumberNotFound()

    if buf[7] != 0x3:
        raise SpecVersionUnsupported()

    def read_uint64(pos):
        return int.from_bytes(buf[pos : pos + 8], byteorder="little")

    def read_int32(pos):
        return int.from_bytes(buf[pos : pos + 4], byteorder="little", signed=True)

    return {
        "version": buf[7],
        "root_offset": read_uint64(8),
        "root_length": read_uint64(16),
        "metadata_offset": read_uint64(24),
        "metadata_length": read_uint64(32),
        "leaf_directory_offset": read_uint64(40),
        "leaf_directory_length": read_uint64(48),
        "tile_data_offset": read_uint64(56),
        "tile_data_length": read_uint64(64),
        "addressed_tiles_count": read_uint64(72),
        "tile_entries_count": read_uint64(80),
        "tile_contents_count": read_uint64(88),
        "clustered": buf[96] == 0x1,
        "internal_compression": Compression(buf[97]),
        "tile_compression": Compression(buf[98]),
        "tile_type": TileType(buf[99]),
        "min_zoom": buf[100],
        "max_zoom": buf[101],
        "min_lon_e7": read_int32(102),
        "min_lat_e7": read_int32(106),
        "max_lon_e7": read_int32(110),
        "max_lat_e7": read_int32(114),
        "center_zoom": buf[118],
        "center_lon_e7": read_int32(119),
        "center_lat_e7": read_int32(123),
    }


def serialize_header(h: HeaderDict):
    b_io = io.BytesIO()

    def write_uint64(i):
        b_io.write(i.to_bytes(8, byteorder="little"))

    def write_int32(i):
        b_io.write(i.to_bytes(4, byteorder="little", signed=True))

    def write_uint8(i):
        b_io.write(i.to_bytes(1, byteorder="little"))

    b_io.write("PMTiles".encode())
    b_io.write(b"\x03")
    write_uint64(h["root_offset"])
    write_uint64(h["root_length"])
    write_uint64(h["metadata_offset"])
    write_uint64(h["metadata_length"])
    write_uint64(h.get("leaf_directory_offset", 0))
    write_uint64(h.get("leaf_directory_length", 0))
    write_uint64(h["tile_data_offset"])
    write_uint64(h["tile_data_length"])
    write_uint64(h.get("addressed_tiles_count", 0))
    write_uint64(h.get("tile_entries_count", 0))
    write_uint64(h.get("tile_contents_count", 0))
    b_io.write(b"\x01" if h["clustered"] else b"\x00")
    write_uint8(h["internal_compression"].value)
    write_uint8(h["tile_compression"].value)
    write_uint8(h["tile_type"].value)
    write_uint8(h["min_zoom"])
    write_uint8(h["max_zoom"])
    min_lon_e7 = h.get("min_lon_e7", int(-180 * 10000000))
    write_int32(min_lon_e7)
    min_lat_e7 = h.get("min_lat_e7", int(-90 * 10000000))
    write_int32(min_lat_e7)
    max_lon_e7 = h.get("max_lon_e7", int(180 * 10000000))
    write_int32(max_lon_e7)
    max_lat_e7 = h.get("max_lat_e7", int(90 * 10000000))
    write_int32(max_lat_e7)
    write_uint8(h.get("center_zoom", h["min_zoom"]))
    write_int32(h.get("center_lon_e7", round((min_lon_e7 + max_lon_e7) / 2)))
    write_int32(h.get("center_lat_e7", round((min_lat_e7 + max_lat_e7) / 2)))

    return b_io.getvalue()
