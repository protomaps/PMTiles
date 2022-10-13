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