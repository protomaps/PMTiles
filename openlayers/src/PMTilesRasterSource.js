import DataTile from "ol/source/DataTile";
import * as pmtiles from "pmtiles";

class PMTilesRasterSource extends DataTile {
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
      state: "loading",
      attributions: options.attributions,
      tileSize: options.tileSize,
    });

    const p = new pmtiles.PMTiles(options.url);
    p.getHeader().then((h) => {
      this.tileGrid.minZoom = h.minZoom;
      this.tileGrid.maxZoom = h.maxZoom;
      this.setLoader(async (z, x, y) => {
        const response = await p.getZxy(z, x, y);
        const blob = new Blob([response.data]);
        const src = URL.createObjectURL(blob);
        const image = await this.loadImage(src);
        URL.revokeObjectURL(src);
        return image;
      });
      this.setState("ready");
    });
  }
}

export default PMTilesRasterSource;
