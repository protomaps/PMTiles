import unittest
from lambda_function import parse_tile_uri


class TestLambda(unittest.TestCase):
    def test_parse_regex(self):
        tileset, tile = parse_tile_uri("/0/0/0.pbf")
        self.assertEqual(tileset, None)
        self.assertEqual(tile.x, 0)
        self.assertEqual(tile.y, 0)
        self.assertEqual(tile.z, 0)

        tileset, tile = parse_tile_uri("abcd")
        self.assertEqual(tile, None)


if __name__ == "__main__":
    unittest.main()
