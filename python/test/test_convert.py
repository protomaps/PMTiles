import unittest
from io import BytesIO
import os
from pmtiles.writer import Writer
from pmtiles.reader import Reader, MemorySource
from pmtiles.convert import pmtiles_to_mbtiles, mbtiles_to_pmtiles


class TestConvert(unittest.TestCase):
    def tearDown(self):
        try:
            os.remove("test_tmp.pmtiles")
        except:
            pass
        try:
            os.remove("test_tmp.mbtiles")
        except:
            pass
        try:
            os.remove("test_tmp_2.mbtiles")
        except:
            pass

    def test_roundtrip(self):

        with open("test_tmp.pmtiles", "wb") as f:
            writer = Writer(f, 7)
            writer.write_tile(1, 0, 0, b"0")
            writer.write_tile(1, 0, 1, b"1")
            writer.write_tile(1, 1, 0, b"2")
            writer.write_tile(1, 1, 1, b"3")
            writer.write_tile(2, 0, 0, b"4")
            writer.write_tile(3, 0, 0, b"5")
            writer.write_tile(2, 0, 1, b"6")
            writer.write_tile(3, 0, 2, b"7")
            writer.finalize({"key": "value"})

        pmtiles_to_mbtiles("test_tmp.pmtiles", "test_tmp.mbtiles", False)
        mbtiles_to_pmtiles("test_tmp.mbtiles", "test_tmp_2.pmtiles", 3, False)
