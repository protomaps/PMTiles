import unittest
from io import BytesIO
from pmtiles.writer import Writer
from pmtiles.reader import Reader, MemorySource


class TestReader(unittest.TestCase):
    def test_roundtrip(self):
        buf = BytesIO()
        # writer = Writer(buf, 5)
        # writer.write_tile(1, 0, 0, b"0")
        # writer.write_tile(1, 0, 1, b"1")
        # writer.write_tile(1, 1, 0, b"2")
        # writer.write_tile(2, 0, 0, b"4")
        # writer.write_tile(3, 0, 0, b"5")
        # writer.write_tile(2, 0, 1, b"6")
        # writer.write_tile(3, 0, 2, b"7")
        # writer.finalize({"key": "value"})

        # reader = Reader(MemorySource(buf.getvalue()))
        # self.assertEqual(reader.header().version, 2)
        # self.assertEqual(reader.header().metadata["key"], "value")
        # self.assertEqual(reader.get(1, 0, 0), b"0")
        # self.assertEqual(reader.get(1, 0, 1), b"1")
        # self.assertEqual(reader.get(1, 1, 0), b"2")
        # self.assertEqual(reader.get(2, 0, 0), b"4")
        # self.assertEqual(reader.get(3, 0, 0), b"5")
        # self.assertEqual(reader.get(2, 0, 1), b"6")
        # self.assertEqual(reader.get(3, 0, 2), b"7")
        # self.assertEqual(reader.get(1, 1, 1), None)
