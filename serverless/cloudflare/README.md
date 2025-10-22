# Protomaps on Cloudflare

See installation and configuration instructions at [Protomaps Docs: Deploy on Cloudflare](https://docs.protomaps.com/deploy/cloudflare)

## Development

### Web Console (basic)

Generate the Workers script using `npm run build` and copy `dist/index.js` to the editor.

### Wrangler (advanced)

The `preview_bucket_name` value in `wrangler.toml` should be changed to your bucket used for development.

Run `npm run start` to serve your Worker at http://localhost:8787. The cache will not be active in development.
