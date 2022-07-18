import base64
import collections
from functools import lru_cache
import gzip
import json
import os
import re
import boto3
import pmtiles

Zxy = collections.namedtuple("Zxy", ["z", "x", "y"])

s3 = boto3.client("s3")


@lru_cache
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


def parse_tile_uri(str):
    m = re.match("^(?:/([0-9a-zA-Z/!\-_\.\*'\(\)]+))?/(\d+)/(\d+)/(\d+).pbf$", str)
    if not m:
        return None, None
    return (m.group(1), Zxy(int(m.group(2)), int(m.group(3)), int(m.group(4))))


def lambda_handler(event, context):
    start = datetime.now()
    uri = event["rawPath"]  # API Gateway and Lambda Function URLs
    tileset, tile = parse_tile_uri(uri)

    if not tile:
        return {"statusCode": 400, "body": "Invalid Tile URL"}

    def get_bytes(offset, length):
        return get_object_bytes(tileset + ".pmtiles", offset, length)

    reader = pmtiles.Reader(get_bytes)
    tile_data = reader.get(tile.z, tile.x, tile.y)
    if not tile_data:
        return {"statusCode": 404, "body": "Tile not found"}

    if reader.header().metadata.get("compression") == "gzip":
        tile_data = gzip.decompress(tile_data)

    return {
        "statusCode": 200,
        "body": base64.b64encode(tile_data),
        "isBase64Encoded": True,
        "headers": {"Content-Type": "application/protobuf"},
    }
