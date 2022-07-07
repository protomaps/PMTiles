import json
import mmap
from contextlib import contextmanager


def MmapSource(f):
    mapping = mmap.mmap(f.fileno(), 0)

    def get_bytes(offset, length):
        return mapping[offset : offset + length]

    return get_bytes


def MemorySource(buf):
    def get_bytes(offset, length):
        return buf[offset : offset + length]

    return get_bytes

class Reader:
    def __init__(self, get_bytes):
        self.get_bytes = get_bytes
        assert int.from_bytes(self.get_bytes(0, 2), byteorder="little") == 0x4D50
        first_entry_idx = 10 + self.metadata_len
        self.root_dir, self.leaves = self.load_directory(
            first_entry_idx, self.root_entries
        )

    def load_directory(self, offset, num_entries):
        directory = {}
        leaves = {}
        for i in range(offset, offset + num_entries * 17, 17):
            z = int.from_bytes(self.get_bytes(i, 1), byteorder="little")
            x = int.from_bytes(self.get_bytes(i + 1, 3), byteorder="little")
            y = int.from_bytes(self.get_bytes(i + 4, 3), byteorder="little")
            tile_off = int.from_bytes(self.get_bytes(i + 7, 6), byteorder="little")
            tile_len = int.from_bytes(self.get_bytes(i + 13, 4), byteorder="little")
            if z & 0b10000000:
                leaves[(z & 0b01111111, x, y)] = (tile_off, tile_len)
            else:
                directory[(z, x, y)] = (tile_off, tile_len)
        return (directory, leaves)

    def close(self):
        self.f.close()

    @property
    def metadata_len(self):
        return int.from_bytes(self.get_bytes(4, 4), byteorder="little")

    @property
    def metadata(self):
        s = self.get_bytes(10, self.metadata_len)
        return json.loads(s)

    @property
    def version(self):
        return int.from_bytes(self.get_bytes(2, 2), byteorder="little")

    @property
    def root_entries(self):
        return int.from_bytes(self.get_bytes(8, 2), byteorder="little")

    @property
    def leaf_level(self):
        return next(iter(self.leaves))[0]

    def get(self, z, x, y):
        val = self.root_dir.get((z, x, y))
        if val:
            return self.get_bytes(val[0], val[1])
        else:
            if len(self.leaves) > 0:
                level_diff = z - self.leaf_level
                leaf = (self.leaf_level, x // (1 << level_diff), y // (1 << level_diff))
                val = self.leaves.get(leaf)
                if val:
                    directory, _ = self.load_directory(val[0], val[1] // 17)
                    val = directory.get((z, x, y))
                    if val:
                        return self.get_bytes(val[0], val[1])

    def tiles(self):
        for k, v in self.root_dir.items():
            yield (k, self.get_bytes(v[0], v[1]))
        for val in self.leaves.values():
            leaf_dir, _ = self.load_directory(val[0], val[1] // 17)
            for k, v in leaf_dir.items():
                yield (k, self.get_bytes(v[0], v[1]))
