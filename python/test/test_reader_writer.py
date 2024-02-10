import unittest
from io import BytesIO
from pmtiles.writer import Writer
from pmtiles.reader import all_tiles, Reader, MemorySource
from pmtiles.tile import Compression, TileType, tileid_to_zxy, zxy_to_tileid


class TestReaderWriter(unittest.TestCase):
    def test_roundtrip(self):
        buf = BytesIO()
        writer = Writer(buf)
        writer.write_tile(zxy_to_tileid(0, 0, 0), b"1")
        writer.write_tile(zxy_to_tileid(1, 0, 0), b"2")
        writer.write_tile(zxy_to_tileid(2, 0, 0), b"3")
        writer.finalize(
            {
                "tile_compression": Compression.UNKNOWN,
                "tile_type": TileType.UNKNOWN,
            },
            {"key": "value"},
        )

        reader = Reader(MemorySource(buf.getvalue()))
        self.assertEqual(reader.header()["version"], 3)
        self.assertEqual(reader.header()["min_zoom"], 0)
        self.assertEqual(reader.header()["max_zoom"], 2)
        self.assertEqual(reader.header()["clustered"], True)
        self.assertEqual(reader.metadata()["key"], "value")
        self.assertEqual(reader.get(0, 0, 0), b"1")
        self.assertEqual(reader.get(1, 0, 0), b"2")
        self.assertEqual(reader.get(2, 0, 0), b"3")
        self.assertEqual(reader.get(3, 0, 0), None)

    def test_roundtrip_unclustered(self):
        buf = BytesIO()
        writer = Writer(buf)
        writer.write_tile(zxy_to_tileid(1, 0, 0), b"2")
        writer.write_tile(zxy_to_tileid(0, 0, 0), b"1")
        writer.finalize(
            {
                "tile_compression": Compression.UNKNOWN,
                "tile_type": TileType.UNKNOWN,
            },
            {},
        )

        reader = Reader(MemorySource(buf.getvalue()))
        self.assertEqual(reader.header()["clustered"], False)

    def test_all_tiles(self):
        buf = BytesIO()
        writer = Writer(buf)
        writer.write_tile(zxy_to_tileid(0, 0, 0), b"1")
        writer.write_tile(zxy_to_tileid(1, 0, 0), b"1")
        writer.write_tile(zxy_to_tileid(2, 0, 0), b"2")
        writer.finalize(
            {
                "tile_compression": Compression.UNKNOWN,
                "tile_type": TileType.UNKNOWN,
            },
            {"key": "value"},
        )

        reader = Reader(MemorySource(buf.getvalue()))
        tiles = list(all_tiles(reader.get_bytes))
        self.assertEqual(tiles, [
            ((0,0,0), b"1"),
            ((1,0,0), b"1"),
            ((2,0,0), b"2"),
        ])