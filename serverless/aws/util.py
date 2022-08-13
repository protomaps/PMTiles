import collections
import re

Zxy = collections.namedtuple("Zxy", ["z", "x", "y"])


def pmtiles_path(p, name):
    if not p:
        p = "{name}.pmtiles"
    return p.replace("{name}", name)


def parse_tile_path(p, str):
    if not p:
        p = "/{name}/{z}/{x}/{y}.pbf"
    p = re.escape(p)
    p = p.replace(r"\{name\}", r"(?P<name>[0-9a-zA-Z/!\-_\.\*'\(\)]+)")
    p = p.replace(r"\{z\}", r"(?P<z>\d+)")
    p = p.replace(r"\{x\}", r"(?P<x>\d+)")
    p = p.replace(r"\{y\}", r"(?P<y>\d+)")
    m = re.match(f"^{p}$", str)
    if not m:
        return None, None
    return (
        m.group("name"),
        Zxy(int(m.group("z")), int(m.group("x")), int(m.group("y"))),
    )


def parse_attribute(string):
    """Convert string representing single attribut to (table, attribute) tuple.

    Boolean True in either position matches anything, False matches nothing."""
    if string is None:
        return (True, True)
    parts = [part.replace("\\:", ":") for part in re.split(r"(?<!\\):", string, 1)]
    if parts[-1] == "*":
        attribute = True
    elif parts[-1] == "":
        attribute = False
    else:
        attribute = parts[-1].replace("\\*", "*")
    if len(parts) == 1:
        table = True
    elif parts[-2] == "*":
        table = True
    elif parts[-2] == "":
        table = False
    else:
        table = parts[-2].replace("\\*", "*")
    return (table, attribute)


def parse_attributes(string):
    """Convert string representing sequence of comma-delimited attributes to list"""
    if string is None:
        return [parse_attribute(string)]
    return [
        parse_attribute(part.replace("\\,", ","))
        for part in re.split(r"(?<!\\),", string)
    ]
