import unittest
from lambda_function import parse_tile_uri, cloudfrontResponse, apiGatewayResponse


class TestLambda(unittest.TestCase):
    def test_parse_regex(self):
        tileset, tile = parse_tile_uri("/0/0/0.pbf")
        self.assertEqual(tileset, None)
        self.assertEqual(tile.x, 0)
        self.assertEqual(tile.y, 0)
        self.assertEqual(tile.z, 0)

        tileset, tile = parse_tile_uri("abcd")
        self.assertEqual(tile, None)

    def test_cloudfront_response(self):
        resp = cloudfrontResponse(200, "ok", False, {"a": "b"})
        self.assertEqual(resp["headers"]["a"], [{"value": "b"}])

    def test_api_gateway_response(self):
        resp = apiGatewayResponse(200, "ok", False, {"a": "b"})
        self.assertEqual(resp["headers"]["a"], "b")


if __name__ == "__main__":
    unittest.main()
