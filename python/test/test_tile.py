import unittest
from pmtiles.tile import zxy_to_tileid, tileid_to_zxy, Entry, find_tile


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
