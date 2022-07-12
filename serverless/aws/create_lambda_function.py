import argparse
import os
import zipfile
import sys

parser = argparse.ArgumentParser(
    description="Create a deployment-ready PMTiles Lambda zip."
)
parser.add_argument("region", help="AWS Region of the S3 bucket.")
parser.add_argument("bucket", help="S3 Bucket Name.")
args = parser.parse_args()

with zipfile.ZipFile("lambda_function.zip", "w", zipfile.ZIP_DEFLATED) as z:
    z.write("lambda_function.py")
    z.write("../../python/pmtiles/reader.py", "pmtiles.py")
    info = zipfile.ZipInfo("config.py")
    info.external_attr = 0o777 << 16
    z.writestr(info, f'REGION="{args.region}"\nBUCKET="{args.bucket}"')

print(f"created lambda_function.zip with REGION {args.region} and BUCKET {args.bucket}")
