import VectorTile from "ol/source/VectorTile";
import TileState from "ol/TileState";
import { MVT } from "ol/format";
import * as pmtiles from "pmtiles";

class PMTilesVectorSource extends VectorTile {
  tileLoadFunction = (tile, url) => {
    // the URL construction is done internally by OL, so we need to parse it
    // back out here using a hacky regex
    const re = new RegExp(/pmtiles:\/\/(.+)\/(\d+)\/(\d+)\/(\d+)/);
    const result = url.match(re);
    const z = +result[2];
    const x = +result[3];
    const y = +result[4];

    tile.setLoader((extent, resolution, projection) => {
      tile.setState(TileState.LOADING);
      this._p.getZxy(z, x, y).then((tile_result) => {
        if (tile_result) {
          const format = tile.getFormat();
          const features = format.readFeatures(tile_result.data.buffer, {
            extent: extent,
            featureProjection: projection,
          });
          tile.setFeatures(features);
          tile.setState(TileState.LOADED);
        } else {
          tile.setFeatures([]);
          tile.setState(TileState.EMPTY);
        } // TODO error state
      });
    });
  };

  constructor(options) {
    super({
      state: "loading",
      url: "pmtiles://" + options.url + "/{z}/{x}/{y}",
      format: new MVT(),
      attributions: options.attributions,
    });

    this._p = new pmtiles.PMTiles(options.url);
    this._p.getHeader().then((h) => {
      this.tileGrid.minZoom = h.minZoom;
      this.tileGrid.maxZoom = h.maxZoom;
      this.setTileLoadFunction(this.tileLoadFunction);
      this.setState("ready");
    });
  }
}

export default PMTilesVectorSource;
