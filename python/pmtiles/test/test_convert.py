import unittest
import sqlite3
from io import BytesIO
import os
import shutil
import json
from pmtiles.writer import Writer
from pmtiles.reader import Reader, MemorySource
from pmtiles.convert import (
    pmtiles_to_mbtiles,
    pmtiles_to_dir,
    mbtiles_to_pmtiles,
    mbtiles_to_header_json,
    disk_to_pmtiles
)
from pmtiles.tile import TileType, Compression


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
        try:
            shutil.rmtree("test_dir")
        except:
            pass
        try:
            os.remove("test_tmp_from_dir.pmtiles")
        except:
            pass

    def test_roundtrip(self):
        with open("test_tmp.pmtiles", "wb") as f:
            writer = Writer(f)
            writer.write_tile(0, b"0")
            writer.write_tile(1, b"1")
            writer.write_tile(2, b"2")
            writer.write_tile(3, b"3")
            writer.write_tile(4, b"4")
            writer.write_tile(5, b"5")
            writer.write_tile(6, b"6")
            writer.write_tile(7, b"7")

            header = {
                "tile_type": TileType.MVT,
                "tile_compression": Compression.GZIP,
                "min_zoom": 0,
                "max_zoom": 2,
                "min_lon_e7": 0,
                "max_lon_e7": 0,
                "min_lat_e7": 0,
                "max_lat_e7": 0,
                "center_zoom": 0,
                "center_lon_e7": 0,
                "center_lat_e7": 0,
                }
            
            metadata = {
                "vector_layers": ['vector','layers'],
                "tilestats":{'tile':'stats'},
                }
            metadata["minzoom"] = header["min_zoom"]
            metadata["maxzoom"] = header["max_zoom"]
            min_lon = header["min_lon_e7"] / 10000000
            min_lat = header["min_lat_e7"] / 10000000
            max_lon = header["max_lon_e7"] / 10000000
            max_lat = header["max_lat_e7"] / 10000000
            metadata["bounds"] = f"{min_lon},{min_lat},{max_lon},{max_lat}"
            center_lon = header["center_lon_e7"] / 10000000
            center_lat = header["center_lat_e7"] / 10000000
            center_zoom = header["center_zoom"]
            metadata["center"] = f"{center_lon},{center_lat},{center_zoom}"
            metadata["format"] = "pbf"

            writer.finalize(
                header,
                metadata,
            )

        pmtiles_to_mbtiles("test_tmp.pmtiles", "test_tmp.mbtiles")
        conn = sqlite3.connect('test_tmp.mbtiles')
        cursor = conn.cursor()
        res = cursor.execute("SELECT value from metadata where name = 'json'")
        data = res.fetchone()[0]
        json_metadata = json.loads(data)
        self.assertEqual(json_metadata['vector_layers'], ['vector', 'layers'])
        self.assertEqual(json_metadata['tilestats'], {'tile':'stats'})

        mbtiles_to_pmtiles("test_tmp.mbtiles", "test_tmp_2.pmtiles", 3)

        pmtiles_to_dir("test_tmp.pmtiles", "test_dir")

        disk_to_pmtiles("test_dir", "test_tmp_from_dir.pmtiles", maxzoom="auto", tile_format="pbz")

    def test_mbtiles_header(self):
        header, json_metadata = mbtiles_to_header_json(
            {
                "name": "test_name",
                "format": "pbf",
                "bounds": "-180.0,-85,180,85",
                "center": "-122.1906,37.7599,11",
                "minzoom": "1",
                "maxzoom": "2",
                "attribution": "<div>abc</div>",
                "compression": "gzip",
                "json": '{"vector_layers":[{"abc":123}],"tilestats":{"def":456}}',
            }
        )
        self.assertEqual(header["min_lon_e7"], -180 * 10000000)
        self.assertTrue(isinstance(header["min_lon_e7"], int))
        self.assertEqual(header["min_lat_e7"], -85 * 10000000)
        self.assertEqual(header["max_lon_e7"], 180 * 10000000)
        self.assertEqual(header["max_lat_e7"], 85 * 10000000)
        self.assertEqual(header["tile_type"], TileType.MVT)
        self.assertEqual(header["center_lon_e7"], -122.1906 * 10000000)
        self.assertEqual(header["center_lat_e7"], 37.7599 * 10000000)
        self.assertEqual(header["center_zoom"], 11)
        self.assertEqual(header["min_zoom"], 1)
        self.assertEqual(header["max_zoom"], 2)
        self.assertEqual(header["tile_compression"], Compression.GZIP)

        self.assertTrue("name" in json_metadata)
        self.assertTrue("format" in json_metadata)
        self.assertTrue("compression" in json_metadata)
