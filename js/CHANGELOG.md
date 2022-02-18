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