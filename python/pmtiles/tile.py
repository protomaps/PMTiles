from collections import namedtuple

Entry = namedtuple("Entry", ["tile_id", "offset", "length", "run_length"])
Header = namedtuple("Header", [])


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
    z = 0
    while True:
        num_tiles = (1 << z) * (1 << z)
        if acc + num_tiles > tile_id:
            return t_on_level(z, tile_id - acc)
        acc += num_tiles
        z += 1


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


def deserialize_directory(bytes):
    pass


def serialize_directory(bytes):
    pass


def deserialize_header(bytes):
    pass


def serialize_header(bytes):
    pass
