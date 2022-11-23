# Protomaps on Cloudflare

See installation and configuration instructions at [Protomaps Docs: Deploy on Cloudflare](https://protomaps.com/docs/cdn/cloudflare)

## Development

Option 1: with Wrangler, run `npm run start` to serve your Worker on http://localhost:8787. The cache will not be active in development.

Option 2: Generate the Workers script using `npm run build` and copy `dist/index.js` to the editor.
