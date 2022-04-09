import unittest
from pmtiles import Entry
from pmtiles.writer import find_leaf_level, make_pyramid


class TestTilePyramid(unittest.TestCase):
    def test_root_sorted(self):
        entries = [
            Entry(1, 0, 0, 1, 1, False),
            Entry(1, 0, 1, 2, 1, False),
            Entry(1, 1, 0, 3, 1, False),
            Entry(1, 1, 1, 4, 1, False),
            Entry(0, 0, 0, 0, 1, False),
        ]
        root_entries, leaf_dirs = make_pyramid(entries, 0, 6)
        self.assertEqual(len(root_entries), 5)
        self.assertEqual(len(leaf_dirs), 0)
        self.assertEqual(root_entries[0].z, 0)
        self.assertEqual(root_entries[4].z, 1)

    def test_leafdir(self):
        entries = [
            Entry(0, 0, 0, 0, 1, False),
            Entry(1, 0, 0, 1, 1, False),
            Entry(1, 0, 1, 2, 1, False),
            Entry(1, 1, 0, 3, 1, False),
            Entry(1, 1, 1, 4, 1, False),
            Entry(2, 0, 0, 5, 1, False),
            Entry(3, 0, 0, 6, 1, False),
            Entry(2, 0, 1, 7, 1, False),
            Entry(3, 0, 2, 8, 1, False),
        ]
        root_entries, leaf_dirs = make_pyramid(entries, 0, 7)
        self.assertEqual(len(root_entries), 7)
        self.assertEqual(root_entries[5].y, 0)
        self.assertEqual(root_entries[6].y, 1)
        self.assertEqual(len(leaf_dirs), 1)
        self.assertEqual(len(leaf_dirs[0]), 4)
        self.assertEqual(leaf_dirs[0][0].z, 2)
        self.assertEqual(leaf_dirs[0][1].z, 2)
        self.assertEqual(leaf_dirs[0][2].z, 3)
        self.assertEqual(leaf_dirs[0][3].z, 3)

    def test_leafdir_overflow(self):
        entries = [
            Entry(0, 0, 0, 0, 1, False),
            Entry(1, 0, 0, 1, 1, False),
            Entry(1, 0, 1, 2, 1, False),
            Entry(1, 1, 0, 3, 1, False),
            Entry(1, 1, 1, 4, 1, False),
            Entry(2, 0, 0, 5, 1, False),
            Entry(3, 0, 0, 6, 1, False),
            Entry(3, 0, 1, 7, 1, False),
            Entry(3, 1, 0, 8, 1, False),
            Entry(3, 1, 1, 9, 1, False),
            Entry(2, 0, 1, 10, 1, False),
            Entry(3, 0, 2, 11, 1, False),
            Entry(3, 0, 3, 12, 1, False),
            Entry(3, 1, 2, 13, 1, False),
            Entry(3, 1, 3, 14, 1, False),
        ]
        root_entries, leaf_dirs = make_pyramid(entries, 0, 7)
        self.assertEqual(len(root_entries), 7)
        self.assertEqual(root_entries[5].y, 0)
        self.assertEqual(root_entries[6].y, 1)

    def test_sparse_pyramid(self):
        entries = [
            Entry(0, 0, 0, 0, 1, False),
            Entry(1, 0, 0, 1, 1, False),
            Entry(1, 0, 1, 2, 1, False),
            Entry(1, 1, 0, 3, 1, False),
            Entry(1, 1, 1, 4, 1, False),
            Entry(2, 0, 0, 5, 1, False),
            Entry(3, 0, 0, 6, 1, False),
            # Entry(2,0,1,7,1,False), make this entry missing
            Entry(3, 0, 2, 8, 1, False),
        ]
        root_entries, leaf_dirs = make_pyramid(entries, 0, 7)
        self.assertEqual(len(root_entries), 7)
        self.assertEqual(root_entries[6].z, 2)
        self.assertEqual(root_entries[6].x, 0)
        self.assertEqual(root_entries[6].y, 1)

    def test_full_z7_pyramid(self):
        entries = []
        # create artificial 8 levels
        for z in range(0, 9):
            for x in range(0, pow(2, z)):
                for y in range(0, pow(2, z)):
                    entries.append(Entry(z, x, y, 0, 0, False))
        self.assertEqual(find_leaf_level(entries, 21845), 7)
        root_entries, leaf_dirs = make_pyramid(entries, 0)
        self.assertEqual(len(root_entries), 21845)
        self.assertEqual(len(leaf_dirs), 4)
        self.assertTrue(len(leaf_dirs[0]) <= 21845)
