import unittest
from pmtiles.tile_id import zxy_to_id, id_to_zxy

class TestTileId(unittest.TestCase):
    def test_encode(self):
        self.assertEqual(zxy_to_id(0,0,0),0)
        self.assertEqual(zxy_to_id(1,0,0),1)
        self.assertEqual(zxy_to_id(1,0,1),2)
        self.assertEqual(zxy_to_id(1,1,1),3)
        self.assertEqual(zxy_to_id(1,1,0),4)
        self.assertEqual(zxy_to_id(2,0,0),5)


    def test_decode(self):
        self.assertEqual(id_to_zxy(0),(0,0,0))
        self.assertEqual(id_to_zxy(1),(1,0,0))
        self.assertEqual(id_to_zxy(2),(1,0,1))
        self.assertEqual(id_to_zxy(3),(1,1,1))
        self.assertEqual(id_to_zxy(4),(1,1,0))
        self.assertEqual(id_to_zxy(5),(2,0,0))


