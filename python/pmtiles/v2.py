from collections import namedtuple


def load_directory(data_bytes, offset, num_entries):
    tile_entries = {}
    leaves = {}
    for i in range(offset, offset + num_entries * 17, 17):
        z = int.from_bytes(data_bytes[i : i + 1], byteorder="little")
        x = int.from_bytes(data_bytes[i + 1 : i + 4], byteorder="little")
        y = int.from_bytes(data_bytes[i + 4 : i + 7], byteorder="little")
        tile_off = int.from_bytes(data_bytes[i + 7 : i + 13], byteorder="little")
        tile_len = int.from_bytes(data_bytes[i + 13 : i + 17], byteorder="little")
        if z & 0b10000000:
            leaves[(z & 0b01111111, x, y)] = (tile_off, tile_len)
        else:
            tile_entries[(z, x, y)] = (tile_off, tile_len)
    return tile_entries, leaves


Header = namedtuple("Header", ["version", "metadata", "root_dir", "leaves"])


class Reader:
    def __init__(self, get_bytes):
        self.get_bytes = get_bytes
        self._header = None

    def header(self):
        if self._header:
            return self._header
        else:
            header_bytes = self.get_bytes(0, 512000)
            assert int.from_bytes(header_bytes[0:2], byteorder="little") == 0x4D50
            version = int.from_bytes(header_bytes[2:4], byteorder="little")
            metadata_len = int.from_bytes(header_bytes[4:8], byteorder="little")
            metadata = json.loads(header_bytes[10 : 10 + metadata_len])
            num_entries = int.from_bytes(header_bytes[8:10], byteorder="little")
            root_dir, leaves = load_directory(
                header_bytes, 10 + metadata_len, num_entries
            )
            self._header = Header(version, metadata, root_dir, leaves)
            return self._header

    def _leaf_level(self):
        h = self.header()
        return next(iter(h.leaves))[0]

    def get(self, z, x, y):
        h = self.header()
        val = h.root_dir.get((z, x, y))
        if val:
            return self.get_bytes(val[0], val[1])
        else:
            if len(self.header().leaves) > 0:
                level_diff = z - self._leaf_level()
                if level_diff < 0:
                    return None
                leaf = (
                    self._leaf_level(),
                    x // (1 << level_diff),
                    y // (1 << level_diff),
                )
                val = h.leaves.get(leaf)
                if val:
                    dir_bytes = self.get_bytes(val[0], val[1])
                    directory, _ = load_directory(dir_bytes, 0, val[1] // 17)
                    val = directory.get((z, x, y))
                    if val:
                        return self.get_bytes(val[0], val[1])

    def tiles(self):
        h = self.header()
        for k, v in h.root_dir.items():
            yield (k, self.get_bytes(v[0], v[1]))
        for val in set(h.leaves.values()):
            dir_bytes = self.get_bytes(val[0], val[1])
            leaf_dir, _ = load_directory(dir_bytes, 0, val[1] // 17)
            for k, v in leaf_dir.items():
                yield (k, self.get_bytes(v[0], v[1]))
