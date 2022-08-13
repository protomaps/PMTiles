import unittest
import util
from util import parse_tile_path, pmtiles_path


class TestAttributes(unittest.TestCase):
    def test_just_attributes(self):
        self.assertEqual(
            util.parse_attributes("foobar"),
            [(True, "foobar")],
            "Should not split on missing comma",
        )
        self.assertEqual(
            util.parse_attributes("foo,bar,baz"),
            [(True, "foo"), (True, "bar"), (True, "baz")],
            "Should split on simple comma",
        )
        self.assertEqual(
            util.parse_attributes("foo\\,bar"),
            [(True, "foo,bar")],
            "Should not split on escaped comma",
        )
        self.assertEqual(
            util.parse_attributes("foo\\\,bar"),
            [(True, "foo\\,bar")],
            "Should not split on escaped comma while allowing escape backslash",
        )
        self.assertEqual(
            util.parse_attributes("foo,bar\\,baz"),
            [(True, "foo"), (True, "bar,baz")],
            "Should split on complex commas",
        )
        self.assertEqual(
            util.parse_attributes("foo\\,bar,baz"),
            [(True, "foo,bar"), (True, "baz")],
            "Should split on complex commas",
        )

    def test_catchall_attributes(self):
        self.assertEqual(
            util.parse_attributes(None),
            [(True, True)],
            "Should match all attributes for no value provided",
        )
        self.assertEqual(
            util.parse_attributes("*"),
            [(True, True)],
            "Should match all attributes for catchall asterisk",
        )
        self.assertEqual(
            util.parse_attributes(""),
            [(True, False)],
            "Should match no attributes for an empty string",
        )
        self.assertEqual(
            util.parse_attributes("\\"),
            [(True, "\\")],
            "Should match attributes named with literal backslash",
        )
        self.assertEqual(
            util.parse_attributes("\\*"),
            [(True, "*")],
            "Should match attributes named with literal asterisk",
        )
        self.assertEqual(
            util.parse_attributes("*:foo,*:bar"),
            [(True, "foo"), (True, "bar")],
            "Should match attributes on catchall tables",
        )
        self.assertEqual(
            util.parse_attributes("\\*:foo,\\*:bar"),
            [("*", "foo"), ("*", "bar")],
            "Should match attributes on tables named with asterisks",
        )

    def test_named_tables(self):
        self.assertEqual(
            util.parse_attributes("foo:bar"),
            [("foo", "bar")],
            "Should match attribute on provided table",
        )
        self.assertEqual(
            util.parse_attributes("foo:*"),
            [("foo", True)],
            "Should match all attributes on provided table",
        )
        self.assertEqual(
            util.parse_attributes("foo\\::"),
            [("foo:", False)],
            "Should match no attributes on provided table",
        )
        self.assertEqual(
            util.parse_attributes("\\,foo\\::\\:bar\\,"),
            [(",foo:", ":bar,")],
            "Should match attribute on provided table",
        )
        self.assertEqual(
            util.parse_attributes("foo:bar,baz:quux"),
            [("foo", "bar"), ("baz", "quux")],
            "Should match attributes on provided tables",
        )
        self.assertEqual(
            util.parse_attributes("foo,bar:baz"),
            [(True, "foo"), ("bar", "baz")],
            "Should match attributes on provided tables",
        )
        self.assertEqual(
            util.parse_attributes("foo:bar,baz"),
            [("foo", "bar"), (True, "baz")],
            "Should match attributes on provided tables",
        )
        self.assertEqual(
            util.parse_attributes(":foo,:bar"),
            [(False, "foo"), (False, "bar")],
            "Should match attributes on no tables",
        )


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
