2.10.0

* Replace `DecompressionStream` polyfill with own `globalThis` detection because of web workers problems.

2.9.0

* Recognize AVIF TileType
* MapLibre adapter internally passes bounds from PMTiles header

2.8.0

* Polyfill `DecompressionStream` using 101arrowz/compression-streams-polyfill
* Surface errors to MapLibre protocol instead of throwing raw exception

2.7.2

* `leafletRasterLayer` sets correct MIME types (via @bmcbride)

2.7.1

* Optimize `zxyToTileId` (via @huOp)

2.7.0

* Fix JS `zxyToTileId` for z > 15

2.6.1

* Replace `BigInt` usage to support older Safari versions.

2.6.0

* Show error when attempting to load a vector archive with `leafletRasterLayer`.
* fix compatibility with servers that return 416 for < 16 kb archives on initial fetch.

2.5.0

* `tryDecompress` is async.
* `Cache` and `PMTiles` take optional `DecompressFunc` for swapping in a different decompressor.
* Cache sizes much more conservative to work around memory problems in serverless.
* Cache size logic is simplified but less robust to variable-sized directories (will revisit later).

2.4.0

* Detect misbehaving ETag servers like Webpack dev server and fail gracefully.

2.3.0

* MapLibre empty tile bytes depends on tile type.

2.2.0

* Fetch client throws exception on non-successful HTTP responses.
* Maximum depth of directory traversal set to 3 like other clients.

2.1.0

* Improve deprecation console warnings.
* MapLibre adapter detects min/max zoom.

2.0.0

* Major version bump, changing the JS API.
* Support for PMTiles spec version 3 archives.
* Backwards compatibility with v2 archives.
* Leaflet and MapLibre adapters support tile cancellation, improving performance significantly.
* ETag and Retry support for archives that are updated in-place.
* Cache-Control and Expires header support for MapLibre.

Clearer API names:

```js
	const p = new pmtiles.PMTiles('example.pmtiles')
	pmtiles.leafletRasterLayer(p).addTo(map)
```
```js
	let protocol = new pmtiles.Protocol();
  maplibregl.addProtocol("pmtiles",protocol.tile);
```


1.0.0 

* Breaking change, introducing new TypeScript module with more clearly defined interfaces.
* Leaflet plugin API changed:

```js
	const p = new pmtiles.PMTiles('example.pmtiles')
	pmtiles.leafletLayer(p).addTo(map)
```

* MapLibre protocol API changed:

```js
	let cache = new pmtiles.ProtocolCache();
  maplibregl.addProtocol("pmtiles",cache.protocol);
```