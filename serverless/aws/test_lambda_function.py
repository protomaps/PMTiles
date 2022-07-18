import unittest
from lambda_function import parse_tile_path, pmtiles_path


class TestLambda(unittest.TestCase):
    def test_parse_tile_default(self):
        name, tile = parse_tile_path(None, "abcd")
        self.assertEqual(tile, None)

        name, tile = parse_tile_path(None, "/foo/11/22/33.pbf")
        self.assertEqual(name, "foo")
        self.assertEqual(tile.z, 11)
        self.assertEqual(tile.x, 22)
        self.assertEqual(tile.y, 33)

    def test_parse_tile_path_setting(self):
        name, tile = parse_tile_path("/{name}/{z}/{y}/{x}.pbf", "/foo/11/22/33.pbf")
        self.assertEqual(tile.x, 33)
        self.assertEqual(tile.y, 22)

        name, tile = parse_tile_path(
            "/tiles/{name}/{z}/{x}/{y}.mvt", "/tiles/foo/4/2/3.mvt"
        )
        self.assertEqual(name, "foo")
        self.assertEqual(tile.z, 4)
        self.assertEqual(tile.x, 2)
        self.assertEqual(tile.y, 3)

    def test_parse_tile_path_setting_special_chars(self):
        name, tile = parse_tile_path(
            "/folder(new/{name}/{z}/{y}/{x}.pbf", "/folder(new/foo/11/22/33.pbf"
        )
        self.assertEqual(name, "foo")

    def test_parse_tile_path_setting_slash(self):
        name, tile = parse_tile_path("/{name}/{z}/{y}/{x}.pbf", "/foo/bar/11/22/33.pbf")
        self.assertEqual(name, "foo/bar")

    def test_pmtiles_path(self):
        self.assertEqual(pmtiles_path(None, "foo"), "foo.pmtiles")
        self.assertEqual(
            pmtiles_path("folder/{name}/file.pmtiles", "foo"),
            "folder/foo/file.pmtiles",
        )

    def test_pmtiles_path_slash(self):
        self.assertEqual(
            pmtiles_path("folder/{name}.pmtiles", "foo/bar"),
            "folder/foo/bar.pmtiles",
        )


if __name__ == "__main__":
    unittest.main()
