import { Data } from "ol/DataTile";
import {
  Options as DataTileSourceOptions,
  default as DataTileSource,
} from "ol/source/DataTile";
import TileState from "ol/TileState";
import { MVT } from "ol/format";
import * as pmtiles from "pmtiles";
import TileSource from "ol/source/Tile";
import { Extent } from "ol/Extent";
import Projection from "ol/proj/Projection";
import Tile from "ol/Tile";
import VectorTile from "ol/VectorTile";
import {
  Options as VectorTileSourceOptions,
  default as VectorTileSource,
} from "ol/source/VectorTile";
import TileGrid from "ol/tilegrid/TileGrid";
import RenderFeature from "ol/render/Feature";

interface PMTilesOptions {
  url: string;
  headers: Headers;
}

export class PMTilesRasterSource extends DataTileSource {
  loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.addEventListener("load", () => resolve(img));
      img.addEventListener("error", () => reject(new Error("load failed")));
      img.src = src;
    });
  };

  constructor(options: DataTileSourceOptions & PMTilesOptions) {
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
    p.getHeader().then((h: pmtiles.Header) => {
      // this.tileGrid.minZoom = h.minZoom;
      // this.tileGrid.maxZoom = h.maxZoom;
      this.setLoader(async (z, x, y): Promise<Data> => {
        const response = await p.getZxy(z, x, y);
        if (!response) {
          return new Uint8Array();
        }
        const src = URL.createObjectURL(new Blob([response.data]));
        const image = await this.loadImage(src);
        URL.revokeObjectURL(src);
        return image;
      });
      this.setState("ready");
    });
  }
}

export class PMTilesVectorSource extends VectorTileSource {
  pmtiles_: pmtiles.PMTiles;

  tileLoadFunction = (tile: Tile, url: string) => {
    const vtile = tile as VectorTile;
    // the URL construction is done internally by OL, so we need to parse it
    // back out here using a hacky regex
    const re = new RegExp(/pmtiles:\/\/(.+)\/(\d+)\/(\d+)\/(\d+)/);
    const result = url.match(re);

    if (!(result && result.length >= 5)) {
      throw Error("Could not parse tile URL");
    }
    const z = +result[2];
    const x = +result[3];
    const y = +result[4];

    vtile.setLoader(
      (extent: Extent, resolution: number, projection: Projection) => {
        this.pmtiles_
          .getZxy(z, x, y)
          .then((tile_result) => {
            if (tile_result) {
              const format = vtile.getFormat();
              vtile.setFeatures(
                format.readFeatures(tile_result.data, {
                  extent: extent,
                  featureProjection: projection,
                }),
              );
              vtile.setState(TileState.LOADED);
            } else {
              vtile.setFeatures([]);
              vtile.setState(TileState.EMPTY);
            }
          })
          .catch((err) => {
            vtile.setFeatures([]);
            vtile.setState(TileState.ERROR);
          });
      },
    );
  };

  constructor(options: VectorTileSourceOptions<RenderFeature> & PMTilesOptions) {
    super({
      ...options,
      ...{
        state: "loading",
        url: "pmtiles://" + options.url + "/{z}/{x}/{y}",
        format: options.format || new MVT(),
      },
    });

    const fetchSource = new pmtiles.FetchSource(
      options.url,
      new Headers(options.headers),
    );
    this.pmtiles_ = new pmtiles.PMTiles(fetchSource);
    this.pmtiles_.getHeader().then((h: pmtiles.Header) => {
      if (this.tileGrid) {
        // this.tileGrid.minZoom = h.minZoom;
        // this.tileGrid.maxZoom = h.maxZoom;
      }
      this.setTileLoadFunction(this.tileLoadFunction);
      this.setState("ready");
    });
  }
}
