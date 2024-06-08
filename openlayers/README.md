# PMTiles for OpenLayers

## Live Examples

[Vector example](https://pmtiles.io/examples/openlayers/vector.html) | [Code](https://github.com/protomaps/PMTiles/blob/main/openlayers/examples/vector.html)

[Raster example](https://pmtiles.io/examples/openlayers/raster.html) | [Code](https://github.com/protomaps/PMTiles/blob/main/openlayers/examples/raster.html)

## Usage

Based on the [OpenLayers Quick Start](https://openlayers.org/doc/quickstart.html)

`npm install ol-pmtiles`

### Raster tiles

```js
import "./style.css";
import { Map, View } from "ol";
import WebGLTile from "ol/layer/WebGLTile";
import { PMTilesRasterSource } from "ol-pmtiles";
import { useGeographic } from 'ol/proj';

const rasterLayer = new WebGLTile({
  source: new PMTilesRasterSource({
    url:"https://r2-public.protomaps.com/protomaps-sample-datasets/terrarium_z9.pmtiles",
    attributions:["https://github.com/tilezen/joerd/blob/master/docs/attribution.md"],
    tileSize: [512,512]
  })
});

useGeographic();

const map = new Map({
  target: "map",
  layers: [rasterLayer],
  view: new View({
    center: [0,0],
    zoom: 1,
  }),
});
```

### Vector tiles

```js
import "./style.css";
import { Map, View } from "ol";
import VectorTile from "ol/layer/VectorTile";
import { PMTilesVectorSource } from "ol-pmtiles";
import { Style, Stroke, Fill } from 'ol/style';
import { useGeographic } from 'ol/proj';

const vectorLayer = new VectorTile({
  declutter: true,
  source: new PMTilesVectorSource({
    url: "https://r2-public.protomaps.com/protomaps-sample-datasets/nz-buildings-v3.pmtiles",
    attributions: ["© Land Information New Zealand"],
  }),
  style: new Style({
    stroke: new Stroke({
      color: "gray",
      width: 1,
    }),
    fill: new Fill({
      color: "rgba(20,20,20,0.9)",
    }),
  }),
});

useGeographic();

const map = new Map({
  target: "map",
  layers: [vectorLayer],
  view: new View({
    center: [172.606201,-43.556510],
    zoom: 7,
  }),
});
```
