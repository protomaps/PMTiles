from enum import Enum
import io
import gzip


class Entry:
    __slots__ = ("tile_id", "offset", "length", "run_length")

    def __init__(self, tile_id, offset, length, run_length):
        self.tile_id = tile_id
        self.offset = offset
        self.length = length
        self.run_length = run_length

    def __str__(self):
        return f"id={self.tile_id} offset={self.offset} length={self.length} runlength={self.run_length}"


def rotate(n, xy, rx, ry):
    if ry == 0:
        if rx == 1:
            xy[0] = n - 1 - xy[0]
            xy[1] = n - 1 - xy[1]
        xy[0], xy[1] = xy[1], xy[0]


def t_on_level(z, pos):
    n = 1 << z
    rx, ry, t = pos, pos, pos
    xy = [0, 0]
    s = 1
    while s < n:
        rx = 1 & (t // 2)
        ry = 1 & (t ^ rx)
        rotate(s, xy, rx, ry)
        xy[0] += s * rx
        xy[1] += s * ry
        t //= 4
        s *= 2
    return z, xy[0], xy[1]


def zxy_to_tileid(z, x, y):
    if z > 31:
        raise OverflowError("tile zoom exceeds 64-bit limit")
    if x > (1 << z) - 1 or y > (1 << z) - 1:
        raise ValueError("tile x/y outside zoom level bounds")
    acc = 0
    tz = 0
    while tz < z:
        acc += (0x1 << tz) * (0x1 << tz)
        tz += 1
    n = 1 << z
    rx = 0
    ry = 0
    d = 0
    xy = [x, y]
    s = n // 2
    while s > 0:
        if (xy[0] & s) > 0:
            rx = 1
        else:
            rx = 0
        if (xy[1] & s) > 0:
            ry = 1
        else:
            ry = 0
        d += s * s * ((3 * rx) ^ ry)
        rotate(s, xy, rx, ry)
        s //= 2
    return acc + d


def tileid_to_zxy(tile_id):
    num_tiles = 0
    acc = 0
    for z in range(0,32):
        num_tiles = (1 << z) * (1 << z)
        if acc + num_tiles > tile_id:
            return t_on_level(z, tile_id - acc)
        acc += num_tiles
    raise OverflowError("tile zoom exceeds 64-bit limit")


def find_tile(entries, tile_id):
    m = 0
    n = len(entries) - 1
    while m < n:
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

def deserialize_header(buf):
    if buf[0:7].decode() != "PMTiles":
        raise MagicNumberNotFound()

    if buf[7] != 0x3:
        raise SpecVersionUnsupported()

    def read_uint64(pos):
        return int.from_bytes(buf[pos : pos + 8], byteorder="little")

    def read_int32(pos):
        return int.from_bytes(buf[pos : pos + 4], byteorder="little", signed=True)

    return {
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


def serialize_header(h):
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
    write_int32(h["min_lon_e7"])
    write_int32(h["min_lat_e7"])
    write_int32(h["max_lon_e7"])
    write_int32(h["max_lat_e7"])
    write_uint8(h["center_zoom"])
    write_int32(h["center_lon_e7"])
    write_int32(h["center_lat_e7"])

    return b_io.getvalue()
