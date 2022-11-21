# PMTiles on Lambda

Generates a Lambda function for deploying PMTiles on Lambda behind Lambda Function URLs or API Gateway. (CloudFront is recommended as a cache in front.)

## How To Use

Self-contained Lambda ZIP:

[protomaps.github.io/PMTiles/lambda_function.zip](https://protomaps.github.io/PMTiles/lambda_function.zip)

(On Safari, right click -> Download Linked File... will keep the ZIP intact)

Building the Lambda ZIP yourself:

```sh
npm run build
```

Upload the resulting `dist/lambda_function.zip` using the Lambda console or paste `dist/index.js`.

Configure these Lambda environment variables:

* `BUCKET`: the S3 bucket name.
* `PMTILES_PATH`: optional, define how a tileset name is translated into an S3 key. Default `{name}.pmtiles`
  * Example path setting for objects in a directory: `my_folder/{name}/file.pmtiles`
* `TILE_PATH`: optional, define the URL route of the tiles API. Default `/{name}/{z}/{x}/{y}.pbf`

For API Gateway integration, your Lambda Proxy Integration route will need to specify a greedy capturing parameter called `proxy` e.g. `/{proxy+}` (the default). API Gateway responses will always be GZIP-encoded.

## Test Event

Lambda Function URLs:

```json
{
  "rawPath": "/my-tileset-name/0/0/0.mvt"
}
```

API Gateway (HTTP or REST):

```json
{
  "pathParameters": {
   "proxy": "my-tileset-name/0/0/0.mvt"
  }
}
```

### Monitoring

TBD

### Lambda@Edge

Lambda@Edge's multi-region features have little benefit when fetching data from S3 in a single region, and Lambda@Edge [doesn't support](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/edge-functions-restrictions.html) environment variables or responses over 1 MB. For globally distributed caching, use CloudFront in combination with Lambda Function URLs.
