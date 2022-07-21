# PMTiles on Lambda

Generates a Lambda function for deploying PMTiles on Lambda behind Lambda Function URLs or API Gateway. (CloudFront is recommended as a cache in front.)

## How To Use

```sh
git clone https://github.com/protomaps/PMTiles
cd serverless/aws
python create_lambda_function.py
```

Upload the resulting `lambda_function.zip` using the Lambda console.

Configure these Lambda environment variables:

* `BUCKET`: the S3 bucket name.
* `PMTILES_PATH`: optional, define how a tileset name is translated into an S3 key. Default `{name}.pmtiles`
  * Example path setting for objects in a directory: `my_folder/{name}/file.pmtiles`
* `TILE_PATH`: optional, define the URL route of the tiles API. Default `/{name}/{z}/{x}/{y}.pbf`

For API Gateway integration, your Lambda Proxy Integration route will need to specify a greedy capturing parameter called `proxy` e.g. `/{proxy+}` (the default)

## Test Event

Lambda Function URLs:

```json
{
  "rawPath": "/my-tileset-name/0/0/0.pbf"
}
```

API Gateway (HTTP or REST):

```json
{
  "pathParameters": {
   "tile_path": "my-tileset-name/0/0/0.pbf"
  }
}
```


### Monitoring



### Lambda@Edge

Lambda@Edge's multi-region features have little benefit when fetching data from S3 in a single region, and Lambda@Edge [doesn't support](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/edge-functions-restrictions.html) environment variables or responses over 1 MB. For globally distributed caching, use CloudFront in combination with Lambda Function URLs.
