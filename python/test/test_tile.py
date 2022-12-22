import unittest
from pmtiles.tile import zxy_to_tileid, tileid_to_zxy, Entry
from pmtiles.tile import read_varint, write_varint
from pmtiles.tile import Entry, find_tile, Compression, TileType
from pmtiles.tile import serialize_directory, deserialize_directory
from pmtiles.tile import serialize_header, deserialize_header, SpecVersionUnsupported, MagicNumberNotFound
import io


class TestVarint(unittest.TestCase):
    def test_read_varint(self):
        buf = io.BytesIO(b"\x00\x01\x7f\xe5\x8e\x26")
        self.assertEqual(read_varint(buf), 0)
        self.assertEqual(read_varint(buf), 1)
        self.assertEqual(read_varint(buf), 127)
        self.assertEqual(read_varint(buf), 624485)

    def test_read_varint_eof(self):
        buf = io.BytesIO(b"")
        self.assertRaises(EOFError, read_varint, buf)

    def test_write_varint(self):
        buf = io.BytesIO()
        write_varint(buf, 0)
        write_varint(buf, 1)
        write_varint(buf, 127)
        write_varint(buf, 624485)
        self.assertEqual(buf.getvalue(), b"\x00\x01\x7f\xe5\x8e\x26")


class TestTileId(unittest.TestCase):
    def test_zxy_to_tileid(self):
        self.assertEqual(zxy_to_tileid(0, 0, 0), 0)
        self.assertEqual(zxy_to_tileid(1, 0, 0), 1)
        self.assertEqual(zxy_to_tileid(1, 0, 1), 2)
        self.assertEqual(zxy_to_tileid(1, 1, 1), 3)
        self.assertEqual(zxy_to_tileid(1, 1, 0), 4)
        self.assertEqual(zxy_to_tileid(2, 0, 0), 5)

    def test_tileid_to_zxy(self):
        self.assertEqual(tileid_to_zxy(0), (0, 0, 0))
        self.assertEqual(tileid_to_zxy(1), (1, 0, 0))
        self.assertEqual(tileid_to_zxy(19078479), (12, 3423, 1763))

    def test_many_tiles(self):
        for z in range(0, 7):
            for x in range(0, 1 << z):
                for y in range(0, 1 << z):
                    i = zxy_to_tileid(z, x, y)
                    rz, rx, ry = tileid_to_zxy(i)
                    self.assertEqual(z, rz)
                    self.assertEqual(x, rx)
                    self.assertEqual(y, ry)

    def test_tile_extremes(self):
        for z in range(0,32):
            dim = (1 << z) - 1
            tl = tileid_to_zxy(zxy_to_tileid(z,0,0))
            self.assertEqual(tl,(z,0,0))
            tr = tileid_to_zxy(zxy_to_tileid(z,dim,0))
            self.assertEqual(tr,(z,dim,0))
            bl = tileid_to_zxy(zxy_to_tileid(z,0,dim))
            self.assertEqual(bl,(z,0,dim))
            br = tileid_to_zxy(zxy_to_tileid(z,dim,dim))
            self.assertEqual(br,(z,dim,dim))

    def test_invalid_tiles(self):
        with self.assertRaises(Exception) as context:
            tileid_to_zxy(18446744073709551615)

        with self.assertRaises(Exception) as context:
            zxy_to_tileid(32,0,0)

        with self.assertRaises(Exception) as context:
            zxy_to_tileid(0,1,1)

class TestFindTile(unittest.TestCase):
    def test_find_tile_missing(self):
        entries = []
        result = find_tile(entries, 0)
        self.assertEqual(result, None)

    def test_find_tile_first(self):
        entries = [Entry(100, 1, 1, 1)]
        result = find_tile(entries, 100)
        self.assertEqual(result.offset, 1)
        self.assertEqual(result.length, 1)

    def test_find_tile_multiple(self):
        entries = [Entry(100, 1, 1, 2)]
        result = find_tile(entries, 101)
        self.assertEqual(result.offset, 1)
        self.assertEqual(result.length, 1)
        entries = [Entry(100, 1, 1, 2), Entry(150, 2, 2, 2)]
        result = find_tile(entries, 151)
        self.assertEqual(result.offset, 2)
        self.assertEqual(result.length, 2)
        entries = [Entry(50, 1, 1, 2), Entry(100, 2, 2, 1), Entry(150, 3, 3, 1)]
        result = find_tile(entries, 51)
        self.assertEqual(result.offset, 1)
        self.assertEqual(result.length, 1)

    def test_find_tile_leaf(self):
        entries = [Entry(100, 1, 1, 0)]
        result = find_tile(entries, 150)
        self.assertEqual(result.offset, 1)
        self.assertEqual(result.length, 1)


class TestDirectory(unittest.TestCase):
    def test_roundtrip(self):
        entries = [Entry(0, 0, 0, 0), Entry(1, 1, 1, 1), Entry(2, 2, 2, 2)]
        serialized = serialize_directory(entries)
        result = deserialize_directory(serialized)
        self.assertEqual(len(result), 3)
        self.assertEqual(result[0].tile_id, 0)
        self.assertEqual(result[0].offset, 0)
        self.assertEqual(result[0].length, 0)
        self.assertEqual(result[0].run_length, 0)
        self.assertEqual(result[1].tile_id, 1)
        self.assertEqual(result[1].offset, 1)
        self.assertEqual(result[1].length, 1)
        self.assertEqual(result[1].run_length, 1)
        self.assertEqual(result[2].tile_id, 2)
        self.assertEqual(result[2].offset, 2)
        self.assertEqual(result[2].length, 2)
        self.assertEqual(result[2].run_length, 2)


class TestHeader(unittest.TestCase):
    def test_roundtrip(self):
        header = {
            "root_offset": 1,
            "root_length": 2,
            "metadata_offset": 3,
            "metadata_length": 4,
            "leaf_directory_offset": 5,
            "leaf_directory_length": 6,
            "tile_data_offset": 7,
            "tile_data_length": 8,
            "addressed_tiles_count": 9,
            "tile_entries_count": 10,
            "tile_contents_count": 11,
            "clustered": True,
            "internal_compression": Compression.GZIP,
            "tile_compression": Compression.BROTLI,
            "tile_type": TileType.MVT,
            "min_zoom": 1,
            "max_zoom": 2,
            "min_lon_e7": int(-1.1 * 10000000),
            "min_lat_e7": int(2.1 * 10000000),
            "max_lon_e7": int(1.2 * 10000000),
            "max_lat_e7": int(2.2 * 10000000),
            "center_zoom": 3,
            "center_lon_e7": int(3.1 * 10000000),
            "center_lat_e7": int(3.2 * 10000000),
        }
        serialized = serialize_header(header)
        result = deserialize_header(serialized)
        self.assertEqual(result["root_offset"], 1)
        self.assertEqual(result["root_length"], 2)
        self.assertEqual(result["metadata_offset"], 3)
        self.assertEqual(result["metadata_length"], 4)
        self.assertEqual(result["leaf_directory_offset"], 5)
        self.assertEqual(result["leaf_directory_length"], 6)
        self.assertEqual(result["tile_data_offset"], 7)
        self.assertEqual(result["tile_data_length"], 8)
        self.assertEqual(result["addressed_tiles_count"], 9)
        self.assertEqual(result["tile_entries_count"], 10)
        self.assertEqual(result["tile_contents_count"], 11)
        self.assertEqual(result["clustered"], True)
        self.assertEqual(result["internal_compression"], Compression.GZIP)
        self.assertEqual(result["tile_compression"], Compression.BROTLI)
        self.assertEqual(result["tile_type"], TileType.MVT)
        self.assertEqual(result["min_zoom"], 1)
        self.assertEqual(result["max_zoom"], 2)
        self.assertEqual(result["min_lon_e7"], -1.1 * 10000000)
        self.assertEqual(result["min_lat_e7"], 2.1 * 10000000)
        self.assertEqual(result["max_lon_e7"], 1.2 * 10000000)
        self.assertEqual(result["max_lat_e7"], 2.2 * 10000000)
        self.assertEqual(result["center_zoom"], 3)
        self.assertEqual(result["center_lon_e7"], 3.1 * 10000000)
        self.assertEqual(result["center_lat_e7"], 3.2 * 10000000)

    def test_spec_version(self):
        with self.assertRaises(SpecVersionUnsupported):
            result = deserialize_header(b'PMTiles\x04')

        with self.assertRaises(MagicNumberNotFound):
            result = deserialize_header(b'PM\x00\x02')
