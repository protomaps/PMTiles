import json
import pmtiles
import re
import boto3
import base64
import collections
from config import BUCKET, REGION

Zxy = collections.namedtuple("Zxy", ["z", "x", "y"])

s3 = boto3.client("s3")

rootCache = {}


def parse_tile_uri(str):
    m = re.match("^(?:/([0-9a-zA-Z/!\-_\.\*'\(\)]+))?/(\d+)/(\d+)/(\d+).pbf$", str)
    if not m:
        return None, None
    return (m.group(1), Zxy(int(m.group(2)), int(m.group(3)), int(m.group(4))))


def cloudfrontResponse(status_code, body, body_b64=False, headers={}):
    headers = {key: [{"value": value}] for key, value in headers.items()}
    resp = {"status": status_code, "body": body, "headers": headers}
    if body_b64:
        resp["bodyEncoding"] = "base64"
    return resp


def apiGatewayResponse(status_code, body, body_b64=False, headers={}):
    resp = {"statusCode": status_code, "body": body, "headers": headers}
    if body_b64:
        resp["isBase64Encoded"] = True
    return resp


def lambda_handler(event, context):
    if "Records" in event:
        uri = event["Records"][0]["cf"]["request"]["uri"]  # CloudFront Origin Request
        lambdaResponse = cloudfrontResponse
    else:
        uri = event["rawPath"]  # API Gateway and Lambda Function URLs
        lambdaResponse = apiGatewayResponse
    tileset, tile = parse_tile_uri(uri)

    if not tile:
        return lambdaResponse(400, "Invalid tile URL")

    def get_bytes(offset, length):
        global rootCache
        if offset == 0 and length == 512000 and tileset in rootCache:
            return rootCache[tileset]

        end = offset + length - 1
        result = (
            s3.get_object(
                Bucket=BUCKET,
                Key=tileset + ".pmtiles",
                Range=f"bytes={offset}-{end}",
            )
            .get("Body")
            .read()
        )
        if offset == 0 and length == 512000:
            rootCache[tileset] = result
        return result

    reader = pmtiles.Reader(get_bytes)
    tile_data = reader.get(tile.z, tile.x, tile.y)
    if not tile_data:
        return lambdaResponse(404, "Tile not found")

    headers = {
        "Content-Encoding": "gzip",
        "Content-Type": "application/protobuf",
        "Access-Control-Allow-Origin": "*",
    }
    return lambdaResponse(200, base64.b64encode(tile_data), True, headers)
