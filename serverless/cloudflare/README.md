# PMTiles on Cloudflare Workers

Use [rclone](https://rclone.org/downloads/) to upload your PMTiles archives to an R2 bucket. The Web UI is limited to 300 MB.

# Getting started

Edit `wrangler.toml` with a new name + your development and production R2 buckets.

Test in development: `npm run start`

Publish the worker: `npm run deploy`

# Settings

By default, your worker will serve tiles at path `NAME/0/0/0.EXT` using the archive at the root of your bucket `NAME.pmtiles`, where EXT is one of `mvt`, `png`, `jpg` or `webp` depending on the tileset.

This behavior can be customized with optional environment variables:

`PMTILES_PATH` - A string like `folder/{name}.pmtiles` specifying the path to archives in your bucket. Default `{name}.pmtiles`

# Using the Workers web editor

Generate the Workers script using `npm run build` and copy `dist/index.js` to the editor.
