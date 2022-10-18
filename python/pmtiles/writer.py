import json
import tempfile
import gzip
import shutil
from contextlib import contextmanager
from .tile import Entry, serialize_directory, Compression, serialize_header


@contextmanager
def write(fname):
    f = open(fname, "wb")
    w = Writer(f)
    try:
        yield w
    finally:
        f.close()


def build_roots_leaves(entries, leaf_size):
    root_entries = []
    leaves_bytes = b""
    num_leaves = 0

    i = 0
    while i < len(entries):
        num_leaves += 1
        serialized = serialize_directory(entries[i : i + leaf_size])
        root_entries.append(
            Entry(entries[i].tile_id, len(leaves_bytes), len(serialized), 0)
        )
        leaves_bytes += serialized
        i += leaf_size

    return serialize_directory(root_entries), leaves_bytes, num_leaves


def optimize_directories(entries, target_root_len):
    test_bytes = serialize_directory(entries)
    if len(test_bytes) < target_root_len:
        return test_bytes, b"", 0

    leaf_size = 4096
    while True:
        root_bytes, leaves_bytes, num_leaves = build_roots_leaves(entries, leaf_size)
        if len(root_bytes) < target_root_len:
            return root_bytes, leaves_bytes, num_leaves
        leaf_size *= 2


class Writer:
    def __init__(self, f):
        self.f = f
        self.tile_entries = []
        self.hash_to_offset = {}
        self.tile_f = tempfile.TemporaryFile()
        self.offset = 0
        self.addressed_tiles = 0

    # TODO enforce ordered writes
    def write_tile(self, tileid, data):
        hsh = hash(data)
        if hsh in self.hash_to_offset:
            last = self.tile_entries[-1]
            found = self.hash_to_offset[hsh]
            if tileid == last.tile_id + last.run_length and last.offset == found:
                self.tile_entries[-1].run_length += 1
            else:
                self.tile_entries.append(Entry(tileid, found, len(data), 1))
        else:
            self.tile_f.write(data)
            self.tile_entries.append(Entry(tileid, self.offset, len(data), 1))
            self.hash_to_offset[hsh] = self.offset
            self.offset += len(data)

        self.addressed_tiles += 1

    def finalize(self, header, metadata):
        print("# of addressed tiles:", self.addressed_tiles)
        print("# of tile entries (after RLE):", len(self.tile_entries))
        print("# of tile contents:", len(self.hash_to_offset))

        header["addressed_tiles_count"] = self.addressed_tiles
        header["tile_entries_count"] = len(self.tile_entries)
        header["tile_contents_count"] = len(self.hash_to_offset)

        root_bytes, leaves_bytes, num_leaves = optimize_directories(
            self.tile_entries, 16384 - 127
        )

        if num_leaves > 0:
            print("Root dir bytes:", len(root_bytes))
            print("Leaves dir bytes:", len(leaves_bytes))
            print("Num leaf dirs:", num_leaves)
            print("Total dir bytes:", len(root_bytes) + len(leaves_bytes))
            print("Average leaf dir bytes:", len(leaves_bytes) / num_leaves)
            print(
                "Average bytes per addressed tile:",
                (len(root_bytes) + len(leaves_bytes)) / self.addressed_tiles,
            )
        else:
            print("Total dir bytes:", len(root_bytes))
            print(
                "Average bytes per addressed tile:",
                len(root_bytes) / self.addressed_tiles,
            )

        compressed_metadata = gzip.compress(json.dumps(metadata).encode())
        header["clustered"] = True
        header["internal_compression"] = Compression.GZIP
        header["root_offset"] = 127
        header["root_length"] = len(root_bytes)
        header["metadata_offset"] = header["root_offset"] + header["root_length"]
        header["metadata_length"] = len(compressed_metadata)
        header["leaf_directory_offset"] = (
            header["metadata_offset"] + header["metadata_length"]
        )
        header["leaf_directory_length"] = len(leaves_bytes)
        header["tile_data_offset"] = (
            header["leaf_directory_offset"] + header["leaf_directory_length"]
        )
        header["tile_data_length"] = self.offset

        header_bytes = serialize_header(header)

        self.f.write(header_bytes)
        self.f.write(root_bytes)
        self.f.write(compressed_metadata)
        self.f.write(leaves_bytes)
        self.tile_f.seek(0)
        shutil.copyfileobj(self.tile_f, self.f)
        self.tile_f.close()
