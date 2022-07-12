
## How To Use

`python create_lambda_function.py MY_REGION MY_BUCKET_NAME`

Upload the resulting `lambda_function.zip` using the Lambda console.

## Restrictions

1. There is a limit of 1 MB for tiles served through Lambda@Edge.
2. Lambda@Edge does not support layers, environment variables, or ARM functions.

## AWS Notes

1. API Gateway (Event format v2.0)
2. Lambda Function URLs are not recommended.

## Test Event

CloudFront event:

```json
{
  "Records": [
    {
      "cf": {
        "request": {
          "uri": "/my-tileset-name/0/0/0.pbf",
          "method": "GET",
          "headers": {}
        }
      }
    }
  ]
}
```

API Gateway V2 / Lambda Function URLs:

```json
{
  "rawPath": "/my-tileset-name/0/0/0.pbf"
}
```