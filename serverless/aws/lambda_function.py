import base64
import collections
from functools import lru_cache
import gzip
import json
import os
import re

# Exists inside all lambda functions
import boto3

# create_lambda_function.py will vendor the relevant file
import pmtiles

Zxy = collections.namedtuple("Zxy", ["z", "x", "y"])

s3 = boto3.client("s3")


# Given a 512MB lambda function, use half of the memory for the cache,
# assuming the average root/leaf/tile size is 512 KB
@lru_cache(maxsize=500)
def get_object_bytes(key, offset, length):
    end = offset + length - 1
    return (
        s3.get_object(
            Bucket=os.environ["BUCKET"],
            Key=key,
            Range=f"bytes={offset}-{end}",
        )
        .get("Body")
        .read()
    )


def pmtiles_path(p, tileset):
    if not p:
        p = "{tileset}.pmtiles"
    return p.replace("{tileset}", tileset)


def parse_tile_path(p, str):
    if not p:
        p = "/{tileset}/{z}/{x}/{y}.pbf"
    p = re.escape(p)
    p = p.replace(r"\{tileset\}", r"(?P<tileset>[0-9a-zA-Z/!\-_\.\*'\(\)]+)")
    p = p.replace(r"\{z\}", r"(?P<z>\d+)")
    p = p.replace(r"\{x\}", r"(?P<x>\d+)")
    p = p.replace(r"\{y\}", r"(?P<y>\d+)")
    m = re.match(f"^{p}$", str)
    if not m:
        return None, None
    return (
        m.group("tileset"),
        Zxy(int(m.group("z")), int(m.group("x")), int(m.group("y"))),
    )


# Assumes event is a API Gateway V2 or Lambda Function URL formatted dict
# and returns API Gateway V2 / Lambda Function dict responses
# Does not work with CloudFront events/Lambda@Edge; see README
def lambda_handler(event, context):
    start = datetime.now()
    uri = event["rawPath"]
    tileset, tile = parse_tile_uri(os.environ.get("TILE_PATH"), uri)

    if not tile:
        return {"statusCode": 400, "body": "Invalid Tile URL"}

    def get_bytes(offset, length):
        return get_object_bytes(
            pmtiles_path(os.environ.get("PMTILES_PATH"), tileset), offset, length
        )

    reader = pmtiles.Reader(get_bytes)
    tile_data = reader.get(tile.z, tile.x, tile.y)
    if not tile_data:
        return {"statusCode": 404, "body": "Tile not found"}

    # CloudFront requires decompressed responses from lambda
    # in order to implement the Compressed CacheOptimized policy correctly
    # as well as Brotli support
    if reader.header().metadata.get("compression") == "gzip":
        tile_data = gzip.decompress(tile_data)

    return {
        "statusCode": 200,
        "body": base64.b64encode(tile_data),
        "isBase64Encoded": True,
        "headers": {"Content-Type": "application/protobuf"},
    }
