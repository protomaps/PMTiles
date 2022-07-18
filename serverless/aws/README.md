
## How To Use

`python create_lambda_function.py MY_REGION MY_BUCKET_NAME`

Upload the resulting `lambda_function.zip` using the Lambda console.


## Configuration

* `BUCKET`: the S3 bucket name.
* `PMTILES_PATH`
* `TILE_PATH`

## AWS Notes

1. API Gateway (Event format v2.0)
2. Lambda Function URLs are not recommended.

## Test Event

API Gateway V2 / Lambda Function URLs:

```json
{
  "rawPath": "/my-tileset-name/0/0/0.pbf"
}
```


### Monitoring



### Lambda@Edge

Lambda@Edge's multi-region features have little benefit when fetching data from S3 in a single region, and Lambda@Edge [doesn't support](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/edge-functions-restrictions.html) environment variables or responses over 1 MB. For globally distributed caching, use CloudFront in combination with Lambda Function URLs.