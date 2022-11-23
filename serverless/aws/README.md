# Installation

See installation and configuration instructions at [Protomaps Docs: Deploy on AWS](https://protomaps.com/docs/cdn/aws)

## Development

Building the Lambda ZIP yourself:

```sh
npm run build
```

Upload the resulting `dist/lambda_function.zip` using the Lambda console or copy and paste `dist/index.mjs`.

## Test Events

Simulate tile requests in the Lambda development console with these JSON events:

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
