import json
import mmap
from .tile import (
    deserialize_header,
    deserialize_directory,
    zxy_to_tileid,
    tileid_to_zxy,
    find_tile,
    Compression,
)
import gzip


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

    def header(self):
        return deserialize_header(self.get_bytes(0, 127))

    def metadata(self):
        header = deserialize_header(self.get_bytes(0, 127))
        metadata = self.get_bytes(header["metadata_offset"], header["metadata_length"])
        if header["internal_compression"] == Compression.GZIP:
            metadata = gzip.decompress(metadata)
        return json.loads(metadata)

    def get(self, z, x, y):
        tile_id = zxy_to_tileid(z, x, y)
        header = deserialize_header(self.get_bytes(0, 127))
        dir_offset = header["root_offset"]
        dir_length = header["root_length"]
        for depth in range(0, 4):  # max depth
            directory = deserialize_directory(self.get_bytes(dir_offset, dir_length))
            result = find_tile(directory, tile_id)
            if result:
                if result.run_length == 0:
                    dir_offset = header["leaf_directory_offset"] + result.offset
                    dir_length = result.length
                else:
                    return self.get_bytes(
                        header["tile_data_offset"] + result.offset, result.length
                    )


def traverse(get_bytes, header, dir_offset, dir_length):
    entries = deserialize_directory(get_bytes(dir_offset, dir_length))
    for entry in entries:
        if entry.run_length > 0:
            yield tileid_to_zxy(entry.tile_id), get_bytes(
                header["tile_data_offset"] + entry.offset, entry.length
            )
        else:
            for t in traverse(
                get_bytes,
                header,
                header["leaf_directory_offset"] + entry.offset,
                entry.length,
            ):
                yield t


def all_tiles(get_bytes):
    header = deserialize_header(get_bytes(0, 127))
    return traverse(get_bytes, header, header["root_offset"], header["root_length"])
