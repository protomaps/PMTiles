import json
import os
import sqlite3
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from io import BytesIO

from pmtiles.reader import MemorySource, Reader, all_tiles
from pmtiles.tile import Compression, TileType, deserialize_directory, tileid_to_zxy
from pmtiles.writer import Writer, build_roots_leaves


def archive(f):
    writer = Writer(f)
    # One run spans z0, all of z1 and the first tile at z2.
    for tile_id in range(6):
        writer.write_tile(tile_id, b"a")
    writer.write_tile(7, b"b")
    writer.finalize(
        {"tile_type": TileType.MVT, "tile_compression": Compression.NONE},
        {"maxzoom": 2, "center": "1,2,2"},
    )


class TestZoomExport(unittest.TestCase):
    def test_skip_leaves_and_clip_run(self):
        buf = BytesIO()
        with patch(
            "pmtiles.writer.optimize_directories",
            lambda entries, _: build_roots_leaves(entries, 1),
        ):
            archive(buf)
        source = MemorySource(buf.getvalue())
        header = Reader(source).header()
        leaves = deserialize_directory(
            source(header["root_offset"], header["root_length"])
        )
        excluded_leaf = header["leaf_directory_offset"] + leaves[1].offset
        reads = []

        def read(offset, length):
            reads.append(offset)
            return source(offset, length)

        self.assertEqual(
            list(all_tiles(read, 1)), [(tileid_to_zxy(i), b"a") for i in range(5)]
        )
        self.assertNotIn(excluded_leaf, reads)
        self.assertNotIn(header["tile_data_offset"] + 1, reads)
        self.assertEqual(len(list(all_tiles(source, 0))), 1)
        self.assertEqual(list(all_tiles(source, 31)), list(all_tiles(source)))

    def test_cli_exports(self):
        cli = Path(__file__).resolve().parents[1] / "bin" / "pmtiles-convert"
        # The upstream test suite runs directly from the source tree.
        env = dict(
            os.environ,
            PYTHONPATH=str(cli.parents[1])
            + os.pathsep
            + os.environ.get("PYTHONPATH", ""),
        )

        def convert(*args, **kwargs):
            return subprocess.run([sys.executable, str(cli), *args], env=env, **kwargs)

        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "input.pmtiles"
            with path.open("wb") as f:
                archive(f)
            db = Path(tmp) / "tiles.mbtiles"
            convert(str(path), str(db), "--maxzoom", "1", check=True)
            conn = sqlite3.connect(db)
            try:
                self.assertEqual(
                    conn.execute(
                        "SELECT zoom_level, count(*) FROM tiles GROUP BY zoom_level ORDER BY zoom_level"
                    ).fetchall(),
                    [(0, 1), (1, 4)],
                )
                self.assertEqual(
                    conn.execute(
                        "SELECT value FROM metadata WHERE name='maxzoom'"
                    ).fetchone(),
                    ("1",),
                )
                self.assertEqual(
                    conn.execute(
                        "SELECT value FROM metadata WHERE name='center'"
                    ).fetchone(),
                    ("1,2,1",),
                )
            finally:
                conn.close()
            out = Path(tmp) / "tiles"
            convert(str(path), str(out), "--maxzoom", "0", check=True)
            self.assertEqual(
                [p.relative_to(out).as_posix() for p in out.rglob("*.mvt")],
                ["0/0/0.mvt"],
            )
            self.assertEqual(
                json.loads((out / "metadata.json").read_text())["maxzoom"], 0
            )
            failed = convert(
                str(path),
                str(db),
                "--maxzoom",
                "-1",
                "--overwrite",
                capture_output=True,
            )
            self.assertNotEqual(failed.returncode, 0)
            self.assertTrue(db.exists())
