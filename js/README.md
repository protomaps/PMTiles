# PMTiles

```js
<script src="https://unpkg.com/pmtiles@1.0.2/dist/index.js"></script>
 ```

 ## Leaflet

 ### Raster tileset

Example of a raster PMTiles archive displayed in Leaflet:

```js
const p = new pmtiles.PMTiles('example.pmtiles')
pmtiles.leafletLayer(p,{attribution:'© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'}).addTo(map)
````

 ### Vector tileset

 See [protomaps.js](https://github.com/protomaps/protomaps.js)

 ## MapLibre GL JS

Example of a vector PMTiles archive displayed in MapLibre GL JS:

```js
let cache = new pmtiles.ProtocolCache();
maplibregl.addProtocol("pmtiles",cache.protocol);
var style = {
"version": 8,
"sources": {
    "example_source": {
        "type": "vector",
        "tiles": ["pmtiles://example.pmtiles/{z}/{x}/{y}"],
    ...
```