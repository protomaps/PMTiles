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
