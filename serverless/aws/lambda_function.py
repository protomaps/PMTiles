import base64
from functools import lru_cache
import gzip
import json
import os

# Exists inside all lambda functions
import boto3
from botocore.exceptions import ClientError

# create_lambda_function.py will vendor the relevant file
from pmtiles.reader import Reader
from util import pmtiles_path, parse_tile_path

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


# Assumes event is a API Gateway V2 or Lambda Function URL formatted dict
# and returns API Gateway V2 / Lambda Function dict responses
# Does not work with CloudFront events/Lambda@Edge; see README
def lambda_handler(event, context):
    path = None
    is_api_gateway = False
    if event.get("pathParameters"):
        is_api_gateway = True
        # API Gateway (HTTP or REST)
        if "proxy" in event["pathParameters"]:
            path = "/" + event["pathParameters"]["proxy"]
        else:
            return {
                "statusCode": 500,
                "body": "Proxy integration missing tile_path parameter",
            }
    else:
        # Lambda Function URL
        path = event.get("rawPath")

    if not path:
        return {
            "statusCode": 500,
            "body": "Invalid event configuration",
        }

    name, tile = parse_tile_path(os.environ.get("TILE_PATH"), path)

    if not tile:
        return {"statusCode": 400, "body": "Invalid tile URL"}

    def get_bytes(offset, length):
        return get_object_bytes(
            pmtiles_path(os.environ.get("PMTILES_PATH"), name), offset, length
        )

    headers = {}

    if "CORS" in os.environ:
        headers["Access-Control-Allow-Origin"] = os.environ.get("CORS")

    reader = Reader(get_bytes)
    try:
        minzoom = int(reader.header().metadata["minzoom"])
        maxzoom = int(reader.header().metadata["maxzoom"])
        if tile.z < minzoom or tile.z > maxzoom:
            return {"statusCode": 404, "headers": headers, "body": "Tile not found"}

        tile_data = reader.get(tile.z, tile.x, tile.y)
        if not tile_data:
            return {"statusCode": 204, "headers": headers}
    except ClientError as e:
        error_code = e.response["Error"]["Code"]
        if error_code == "AccessDenied":
            return {"statusCode": 404, "headers": headers, "body": "Archive not found"}
        else:
            raise e

    headers["Content-Type"] = "application/protobuf"

    if reader.header().metadata.get("compression") == "gzip":
        if is_api_gateway:
            # API Gateway requires a compressed response to correctly return binary data
            # instead of base64
            headers["Content-Encoding"] = "gzip"
        else:
            # CloudFront requires decompressed responses from lambda
            # in order to implement the Compressed CacheOptimized policy correctly
            # as well as Brotli support
            tile_data = gzip.decompress(tile_data)

    return {
        "statusCode": 200,
        "body": base64.b64encode(tile_data),
        "isBase64Encoded": True,
        "headers": headers,
    }
