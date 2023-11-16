// IMPORTANT: this file is manually edited!
// copy any changes made from src/index.js to here
// to automate this we need a rollup or esbuild script
// to resolve the imports to the ol global correctly
// as well as get the enum values of TileState, which is elided

// import DataTile from "ol/source/DataTile";
// import VectorTile from "ol/source/VectorTile";
// import TileState from "ol/TileState";
// import { MVT } from "ol/format";
import * as pmtiles from "pmtiles";

export class PMTilesRasterSource extends ol.source.DataTile {
  loadImage = (src) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.addEventListener("load", () => resolve(img));
      img.addEventListener("error", () => reject(new Error("load failed")));
      img.src = src;
    });
  };

  constructor(options) {
    super({
      ...options,
      ...{
        state: "loading",
      },
    });

    const fetchSource = new pmtiles.FetchSource(
      options.url,
      new Headers(options.headers),
    );
    const p = new pmtiles.PMTiles(fetchSource);
    p.getHeader().then((h) => {
      this.tileGrid.minZoom = h.minZoom;
      this.tileGrid.maxZoom = h.maxZoom;
      this.setLoader(async (z, x, y) => {
        const response = await p.getZxy(z, x, y);
        const src = URL.createObjectURL(new Blob([response.data]));
        const image = await this.loadImage(src);
        URL.revokeObjectURL(src);
        return image;
      });
      this.setState("ready");
    });
  }
}

export class PMTilesVectorSource extends ol.source.VectorTile {
  tileLoadFunction = (tile, url) => {
    // the URL construction is done internally by OL, so we need to parse it
    // back out here using a hacky regex
    const re = new RegExp(/pmtiles:\/\/(.+)\/(\d+)\/(\d+)\/(\d+)/);
    const result = url.match(re);
    const z = +result[2];
    const x = +result[3];
    const y = +result[4];

    tile.setLoader((extent, resolution, projection) => {
      tile.setState(1);
      this.pmtiles_
        .getZxy(z, x, y)
        .then((tile_result) => {
          if (tile_result) {
            const format = tile.getFormat();
            tile.setFeatures(
              format.readFeatures(tile_result.data, {
                extent: extent,
                featureProjection: projection,
              }),
            );
            tile.setState(2);
          } else {
            tile.setFeatures([]);
            tile.setState(4);
          }
        })
        .catch((err) => {
          tile.setFeatures([]);
          tile.setState(3);
        });
    });
  };

  constructor(options) {
    super({
      ...options,
      ...{
        state: "loading",
        url: "pmtiles://" + options.url + "/{z}/{x}/{y}",
        format: new ol.format.MVT(),
      },
    });

    const fetchSource = new pmtiles.FetchSource(
      options.url,
      new Headers(options.headers),
    );
    this.pmtiles_ = new pmtiles.PMTiles(fetchSource);
    this.pmtiles_.getHeader().then((h) => {
      this.tileGrid.minZoom = h.minZoom;
      this.tileGrid.maxZoom = h.maxZoom;
      this.setTileLoadFunction(this.tileLoadFunction);
      this.setState("ready");
    });
  }
}
