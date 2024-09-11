import { Data } from "ol/DataTile";
import {
  Options as DataTileSourceOptions,
  default as DataTileSource,
} from "ol/source/DataTile";
import TileState from "ol/TileState";
import { MVT } from "ol/format";
import TileSource from "ol/source/Tile";
import { Extent } from "ol/Extent";
import Projection from "ol/proj/Projection";
import Tile from "ol/Tile";
import VectorTile from "ol/VectorTile";
import {
  Options as VectorTileSourceOptions,
  default as VectorTileSource,
} from "ol/source/VectorTile";
import RenderFeature from "ol/render/Feature";
import { createXYZ, extentFromProjection } from "ol/tilegrid";
import { PMTiles, Header, Source } from "pmtiles";

export class PMTilesRasterSource extends DataTileSource {
  loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.addEventListener("load", () => resolve(img));
      img.addEventListener("error", () => reject(new Error("load failed")));
      img.src = src;
    });
  };

  constructor(options: DataTileSourceOptions & { url: string | Source }) {
    super({
      ...options,
      ...{
        state: "loading",
      },
    });

    const p = new PMTiles(options.url);
    p.getHeader().then((h: Header) => {
      const projection =
        options.projection === undefined ? "EPSG:3857" : options.projection;
      this.tileGrid =
        options.tileGrid ||
        createXYZ({
          extent: extentFromProjection(projection),
          maxResolution: options.maxResolution,
          minZoom: h.minZoom,
          maxZoom: h.maxZoom,
          tileSize: options.tileSize,
        });
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
  pmtiles_: PMTiles;

  tileLoadFunction = (tile: Tile, url: string) => {
    const vtile = tile as VectorTile;
    // the URL construction is done internally by OL, so we need to parse it
    // back out here using a hacky regex
    const re = new RegExp(/pmtiles:\/\/(\d+)\/(\d+)\/(\d+)/);
    const result = url.match(re);

    if (!(result && result.length >= 4)) {
      throw Error("Could not parse tile URL");
    }
    const z = +result[1];
    const x = +result[2];
    const y = +result[3];

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

  constructor(
    options: VectorTileSourceOptions<RenderFeature> & { url: string | Source },
  ) {
    super({
      ...options,
      ...{
        state: "loading",
        url: "pmtiles://{z}/{x}/{y}",
        format: options.format || new MVT(),
      },
    });

    this.pmtiles_ = new PMTiles(options.url);
    this.pmtiles_.getHeader().then((h: Header) => {
      const projection = options.projection || "EPSG:3857";
      const extent = options.extent || extentFromProjection(projection);
      this.tileGrid =
        options.tileGrid ||
        createXYZ({
          extent: extent,
          maxResolution: options.maxResolution,
          maxZoom: options.maxZoom !== undefined ? options.maxZoom : h.maxZoom,
          minZoom: h.minZoom,
          tileSize: options.tileSize || 512,
        });
      this.setTileLoadFunction(this.tileLoadFunction);
      this.setState("ready");
    });
  }
}
