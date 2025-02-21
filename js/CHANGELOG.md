4.3.0
* improve ZXY to HilbertID conversion by @ciscorn [#527]

4.2.1
* MapLibre adapter detects erroneous tileset bounds and shows console error [#508]

4.1.0
* MapLibre `Protocol` constructor takes `errorOnMissingTile` option. [#505]
  - Use this only for parity with the overzooming behavior of ZXY tile APIs.

4.0.1
* fix iife build via esbuild configuration for fflate browser dependency

4.0.0
* remove pmtiles spec v2 support, which reduces bundle size significantly [#287]
* use tsup for creating cjs/esm packages, which fixes typescript usage [#498]
* re-structure files in js project to be more conventional.

3.2.0
* MapLibre `Protocol` constructor takes an options object.
* add protocol option `metadata:boolean` that controls whether TileJSON metadata is fetched synchronously on map load. [#247]
	* This populates the attribution field and is required for some inspector applications to work.

3.1.0
* disable brower caching if Chrome + Windows is detected in user agent to work around https://issues.chromium.org/issues/40542704 [#384, #442, #445]
* add getTileJson to PMTiles [#239]

3.0.7
* improve ETag error message [#427]

3.0.6
* add CommonJS build fallback for NodeJS projects not using ESM.

3.0.5
* fix missing files in dist/ for build systems that bundle .ts files

3.0.4
* export DecompressFunc type

3.0.3

* Deprecate `prefetch`-ing the first 16 kb as an option, always true
* Optimize invalidation when etag changes when promises are shared between tile requests. [#90]

3.0.2

* Fix name of script includes (IIFE) name from `index.js` to `pmtiles.js`
* Fix name of ES6 module from `index.mjs` to `index.js`, which fixes bundlers detecting TypeScript types (index.d.ts)

3.0.1

* FileApiSource renamed to FileSource
* package.json defines **ES6 module only** (no CommonJS), fixing issues related to named imports [#317, #248]
* support MapLibre GL v4.x
* `Source` API changed to take ETag, making conditional `If-Match` requests possible [#90]
* FetchSource includes cachebuster logic for browser cache only on ETag change
* Ignore weak ETags, greatly simplify ETag logic
* Internal code has consistent naming and style conventions, change to biome linter [#287]

2.11.0

* `FetchSource` takes optional 2nd param `Headers` to apply custom headers to all requests.

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