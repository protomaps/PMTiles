import unittest
from lambda_function import parse_tile_path, pmtiles_path


class TestLambda(unittest.TestCase):
    def test_parse_tile_default(self):
        tileset, tile = parse_tile_path(None, "abcd")
        self.assertEqual(tile, None)

        tileset, tile = parse_tile_path(None, "/foo/11/22/33.pbf")
        self.assertEqual(tileset, "foo")
        self.assertEqual(tile.z, 11)
        self.assertEqual(tile.x, 22)
        self.assertEqual(tile.y, 33)

    def test_parse_tile_path_setting(self):
        tileset, tile = parse_tile_path(
            "/{tileset}/{z}/{y}/{x}.pbf", "/foo/11/22/33.pbf"
        )
        self.assertEqual(tile.x, 33)
        self.assertEqual(tile.y, 22)

        tileset, tile = parse_tile_path(
            "/tiles/{tileset}/{z}/{x}/{y}.mvt", "/tiles/foo/4/2/3.mvt"
        )
        self.assertEqual(tileset, "foo")
        self.assertEqual(tile.z, 4)
        self.assertEqual(tile.x, 2)
        self.assertEqual(tile.y, 3)

    def test_parse_tile_path_setting_special_chars(self):
        tileset, tile = parse_tile_path(
            "/folder(new/{tileset}/{z}/{y}/{x}.pbf", "/folder(new/foo/11/22/33.pbf"
        )
        self.assertEqual(tileset, "foo")

    def test_pmtiles_path(self):
        self.assertEqual(pmtiles_path(None, "foo"), "foo.pmtiles")
        self.assertEqual(
            pmtiles_path("folder/{tileset}/file.pmtiles", "foo"),
            "folder/foo/file.pmtiles",
        )


if __name__ == "__main__":
    unittest.main()
