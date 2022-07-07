import itertools
import json
from contextlib import contextmanager
from pmtiles import Entry


def entrysort(t):
    return (t.z, t.x, t.y)


# Find best base zoom to avoid extra indirection for as many tiles as we can
# precondition: entries is sorted, only tile entries, len(entries) > max_dir_size
def find_leaf_level(entries, max_dir_size):
    return entries[max_dir_size].z - 1


def make_pyramid(tile_entries, start_leaf_offset, max_dir_size=21845):
    sorted_entries = sorted(tile_entries, key=entrysort)
    if len(sorted_entries) <= max_dir_size:
        return (sorted_entries, [])

    leaf_dirs = []

    # determine root leaf level
    leaf_level = find_leaf_level(sorted_entries, max_dir_size)

    def by_parent(e):
        level_diff = e.z - leaf_level
        return (leaf_level, e.x // (1 << level_diff), e.y // (1 << level_diff))

    root_entries = [e for e in sorted_entries if e.z < leaf_level]
    # get all entries greater than or equal to the leaf level
    entries_in_leaves = [e for e in sorted_entries if e.z >= leaf_level]

    # group the entries by their parent (stable)
    entries_in_leaves.sort(key=by_parent)

    current_offset = start_leaf_offset
    # pack entries into groups
    packed_entries = []
    packed_roots = []

    for group in itertools.groupby(entries_in_leaves, key=by_parent):
        subpyramid_entries = list(group[1])

        root = by_parent(subpyramid_entries[0])
        if len(packed_entries) + len(subpyramid_entries) <= max_dir_size:
            packed_entries.extend(subpyramid_entries)
            packed_roots.append((root[0], root[1], root[2]))
        else:
            # flush the current packed entries

            for p in packed_roots:
                root_entries.append(
                    Entry(
                        p[0], p[1], p[2], current_offset, 17 * len(packed_entries), True
                    )
                )
            # re-sort the packed_entries by ZXY order
            packed_entries.sort(key=entrysort)
            leaf_dirs.append(packed_entries)

            current_offset += 17 * len(packed_entries)
            packed_entries = subpyramid_entries
            packed_roots = [(root[0], root[1], root[2])]

    # finalize the last set
    if len(packed_entries):

        for p in packed_roots:
            root_entries.append(
                Entry(p[0], p[1], p[2], current_offset, 17 * len(packed_entries), True)
            )
        # re-sort the packed_entries by ZXY order
        packed_entries.sort(key=entrysort)
        leaf_dirs.append(packed_entries)

    return (root_entries, leaf_dirs)


@contextmanager
def write(fname):
    f = open(fname, "wb")
    w = Writer(f, 21845)
    try:
        yield w
    finally:
        f.close()


class Writer:
    def __init__(self, f, max_dir_size):
        self.offset = 512000
        self.f = f
        self.f.write(b"\0" * self.offset)
        self.tile_entries = []
        self.hash_to_offset = {}
        self.max_dir_size = max_dir_size

    def write_tile(self, z, x, y, data):
        hsh = hash(data)
        if hsh in self.hash_to_offset:
            self.tile_entries.append(
                Entry(z, x, y, self.hash_to_offset[hsh], len(data), False)
            )
        else:
            self.f.write(data)
            self.tile_entries.append(Entry(z, x, y, self.offset, len(data), False))
            self.hash_to_offset[hsh] = self.offset
            self.offset = self.offset + len(data)

    def _write_entry(self, entry):
        if entry.is_dir:
            z_bytes = 0b10000000 | entry.z
        else:
            z_bytes = entry.z
        self.f.write(z_bytes.to_bytes(1, byteorder="little"))
        self.f.write(entry.x.to_bytes(3, byteorder="little"))
        self.f.write(entry.y.to_bytes(3, byteorder="little"))
        self.f.write(entry.offset.to_bytes(6, byteorder="little"))
        self.f.write(entry.length.to_bytes(4, byteorder="little"))

    def _write_header(self, metadata, root_entries_len):
        self.f.write((0x4D50).to_bytes(2, byteorder="little"))
        self.f.write((2).to_bytes(2, byteorder="little"))
        metadata_serialized = json.dumps(metadata)
        # 512000 - (17 * 21845) - 2 (magic) - 2 (version) - 4 (jsonlen) - 2 (dictentries) = 140625
        assert len(metadata_serialized) < 140625
        self.f.write(len(metadata_serialized).to_bytes(4, byteorder="little"))
        self.f.write(root_entries_len.to_bytes(2, byteorder="little"))
        self.f.write(metadata_serialized.encode("utf-8"))

    def finalize(self, metadata={}):
        root_dir, leaf_dirs = make_pyramid(
            self.tile_entries, self.offset, self.max_dir_size
        )

        if len(leaf_dirs) > 0:
            for leaf_dir in leaf_dirs:
                for entry in leaf_dir:
                    self._write_entry(entry)

        self.f.seek(0)
        self._write_header(metadata, len(root_dir))

        for entry in root_dir:
            self._write_entry(entry)

        return {
            "num_tiles": len(self.tile_entries),
            "num_unique_tiles": len(self.hash_to_offset),
            "num_leaves": len(leaf_dirs),
        }
