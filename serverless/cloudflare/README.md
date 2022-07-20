# PMTiles on Cloudflare Workers

Use [rclone](https://rclone.org/downloads/) to upload your PMTiles archives to an R2 bucket. The Web UI is limited to 300 MB.

# Getting started

* Generate `worker.js` with all dependencies bundled:

```sh
git clone https://github.com/protomaps/PMTiles
cd serverless/cloudflare
npm run build
```

Copy `dist/worker.js` into the Cloudflare Workers editor. 

* In Settings > Variables, bind your bucket to the environment variable `BUCKET`.

By default, your worker will serve tiles at path `NAME/0/0/0.pbf` using the archive at the root of your bucket `NAME.pmtiles`.

This behavior can be customized with two optional environment variables:

`PMTILES_PATH`
`TILE_PATH`

(TODO)
