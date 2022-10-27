the [PMTiles](https://www.npmjs.com/package/pmtiles) JavaScript package includes plugins for both Leaflet and MapLibre 1.15+.

Load via script tag:

```html
<script src="https://unpkg.com/pmtiles@2.3.0/dist/index.js"></script>
```

As an ES6 module: ```npm add pmtiles``` and:

```js
import { PMTiles } from "pmtiles";
```

## Leaflet

### Raster tileset

Example of a raster PMTiles archive displayed in Leaflet:

```js
const p = new pmtiles.PMTiles('example.pmtiles')
pmtiles.leafletRasterLayer(p,{attribution:'© <a href="https://openstreetmap.org">OpenStreetMap</a>'}).addTo(map)
````


[Live example](https://protomaps.github.io/PMTiles/examples/leaflet.html) | [Code](https://github.com/protomaps/PMTiles/blob/master/js/examples/leaflet.html)

### Vector tileset

See [protomaps.js](https://github.com/protomaps/protomaps.js)

## MapLibre GL JS

Example of a PMTiles archive displayed in MapLibre GL JS:

```js
let protocol = new pmtiles.Protocol();
maplibregl.addProtocol("pmtiles",protocol.tile);
var style = {
"version": 8,
"sources": {
    "example_source": {
        "type": "vector",
        "url": "pmtiles://https://example.com/example.pmtiles",
        "attribution": '© <a href="https://openstreetmap.org">OpenStreetMap</a>'
    ...
```

[Live example](https://protomaps.github.io/PMTiles/examples/maplibre.html) | [Code](https://github.com/protomaps/PMTiles/blob/master/js/examples/maplibre.html)

# CORS

Reading a PMTiles archive from cloud storage requires [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) configuration if your web page is hosted on a different domain than your storage bucket.

## Amazon S3 and S3-Compatible Storage

```json
[
    {
        "AllowedHeaders": ["Range"],
        "AllowedMethods": ["GET","HEAD"],
        "AllowedOrigins": ["*","example.com"],
        "ExposeHeaders": ["ETag"],
        "MaxAgeSeconds": 3000
    }
]
```

## Google Cloud Storage

```json
[
    {
      "origin": ["example.com","*"],
      "method": ["GET","HEAD"],
      "responseHeader": ["range","etag"],
      "maxAgeSeconds": 3000
    }
]
```

### Setting CORS from the command line

[AWS CLI](https://aws.amazon.com/cli/) is the recommended way to do this:

create a file `cors_rules.json`:

```json
{
  "CORSRules": [
    {
      "AllowedOrigins": ["example.com","*"],
      "AllowedHeaders": ["range"],
      "AllowedMethods": ["GET","HEAD"],
      "MaxAgeSeconds": 3000,
      "ExposeHeaders": ["ETag"]
    }
  ]
}
```

Then configure your bucket with:
```sh
aws s3api put-bucket-cors --bucket MY_BUCKET --cors-configuration file:///home/user/cors_rules.json
```
Optional arguments:

* `-endpoint-url https://S3_COMPATIBLE_ENDPOINT`: for non-S3 storages.
* `--profile PROFILE`: choose credentials named in `~/.aws/credentials`
