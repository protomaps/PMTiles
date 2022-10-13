# PMTiles

 the [PMTiles](https://www.npmjs.com/package/pmtiles) package can be included via script tag or ES6 module.

 ## Leaflet

 ### Raster tileset

Example of a raster PMTiles archive displayed in Leaflet:

```js
const p = new pmtiles.PMTiles('example.pmtiles')
pmtiles.leafletRasterLayer(p,{attribution:'© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'}).addTo(map)
````

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
        "tiles": ["pmtiles://example.pmtiles/{z}/{x}/{y}"],
    ...
```
