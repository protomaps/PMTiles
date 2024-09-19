# Protomaps on AWS

See installation and configuration instructions at [Protomaps Docs: Deploy on AWS](https://protomaps.com/docs/cdn/aws)

## Development

The code for the lambda function imports from the top level `js/` directory. You will therfore need to first run `npm install` and `npm run build` in the `js/` directory, and then run `npm install` in the `serverless/aws` directory.

You should then be able to build the Lambda ZIP:

```sh
npm run build-zip
```

Upload the resulting `dist/lambda_function.zip` using the Lambda console or copy and paste `dist/index.mjs`.

## Test Events

JSON for simulating tile requests in the Lambda development console.

Lambda Function URLs:

```json
{
  "rawPath": "/my-tileset-name/0/0/0.mvt"
}
```

API Gateway (REST API with Lambda Proxy Integration):

```json
{
  "pathParameters": {
   "proxy": "my-tileset-name/0/0/0.mvt"
  }
}
```
