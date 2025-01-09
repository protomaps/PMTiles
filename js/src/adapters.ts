// biome-ignore lint: needed for Leaflet + IIFE to work
declare const L: any;
// biome-ignore lint: needed for window.URL to disambiguate from cloudflare workers
declare const window: any;
declare const document: DocumentLike;

import type { Coords } from "leaflet";
import { PMTiles, TileType } from "./index";

interface DocumentLike {
  // biome-ignore lint: we don't want to bring in the entire document type
  createElement: (s: string) => any;
}

// biome-ignore lint: we don't want to bring in the entire document type
type DoneCallback = (error?: Error, tile?: any) => void;

/**
 * Add a raster PMTiles as a layer to a Leaflet map.
 *
 * For vector tiles see https://github.com/protomaps/protomaps-leaflet
 */
export const leafletRasterLayer = (source: PMTiles, options: unknown) => {
  let loaded = false;
  let mimeType = "";
  const cls = L.GridLayer.extend({
    createTile: (coord: Coords, done: DoneCallback) => {
      const el = document.createElement("img");
      const controller = new AbortController();
      const signal = controller.signal;
      el.cancel = () => {
        controller.abort();
      };
      if (!loaded) {
        source.getHeader().then((header) => {
          if (header.tileType === TileType.Mvt) {
            console.error(
              "Error: archive contains MVT vector tiles, but leafletRasterLayer is for displaying raster tiles. See https://github.com/protomaps/PMTiles/tree/main/js for details."
            );
          } else if (header.tileType === 2) {
            mimeType = "image/png";
          } else if (header.tileType === 3) {
            mimeType = "image/jpeg";
          } else if (header.tileType === 4) {
            mimeType = "image/webp";
          } else if (header.tileType === 5) {
            mimeType = "image/avif";
          }
        });
        loaded = true;
      }
      source
        .getZxy(coord.z, coord.x, coord.y, signal)
        .then((arr) => {
          if (arr) {
            const blob = new Blob([arr.data], { type: mimeType });
            const imageUrl = window.URL.createObjectURL(blob);
            el.src = imageUrl;
            el.cancel = undefined;
            done(undefined, el);
          }
        })
        .catch((e) => {
          if (e.name !== "AbortError") {
            throw e;
          }
        });
      return el;
    },

    _removeTile: function (key: string) {
      const tile = this._tiles[key];
      if (!tile) {
        return;
      }

      if (tile.el.cancel) tile.el.cancel();

      tile.el.width = 0;
      tile.el.height = 0;
      tile.el.deleted = true;
      L.DomUtil.remove(tile.el);
      delete this._tiles[key];
      this.fire("tileunload", {
        tile: tile.el,
        coords: this._keyToTileCoords(key),
      });
    },
  });
  return new cls(options);
};

type GetResourceResponse<T> = ExpiryData & {
  data: T;
};
type AddProtocolAction = (
  requestParameters: RequestParameters,
  abortController: AbortController
) => Promise<GetResourceResponse<unknown>>;

type ExpiryData = {
  cacheControl?: string | null;
  expires?: string | null; // MapLibre can be a Date object
};

// copied from MapLibre /util/ajax.ts
type RequestParameters = {
  url: string;
  headers?: unknown;
  method?: "GET" | "POST" | "PUT";
  body?: string;
  type?: "string" | "json" | "arrayBuffer" | "image";
  credentials?: "same-origin" | "include";
  collectResourceTiming?: boolean;
};

// for legacy maplibre-3 interop
type ResponseCallbackV3 = (
  error?: Error | undefined,
  data?: unknown | undefined,
  cacheControl?: string | undefined,
  expires?: string | undefined
) => void;

type V3OrV4Protocol = <
  T extends AbortController | ResponseCallbackV3,
  R = T extends AbortController
    ? Promise<GetResourceResponse<unknown>>
    : { cancel: () => void },
>(
  requestParameters: RequestParameters,
  arg2: T
) => R;

const v3compat =
  (v4: AddProtocolAction): V3OrV4Protocol =>
  (requestParameters, arg2) => {
    if (arg2 instanceof AbortController) {
      // biome-ignore lint: overloading return type not handled by compiler
      return v4(requestParameters, arg2) as any;
    }
    const abortController = new AbortController();
    v4(requestParameters, abortController)
      .then(
        (result) => {
          return arg2(
            undefined,
            result.data,
            result.cacheControl || "",
            result.expires || ""
          );
        },
        (err) => {
          return arg2(err);
        }
      )
      .catch((e) => {
        return arg2(e);
      });
    return { cancel: () => abortController.abort() };
  };

/**
 * MapLibre GL JS protocol. Must be added once globally.
 */
export class Protocol {
  /** @hidden */
  tiles: Map<string, PMTiles>;
  metadata: boolean;
  errorOnMissingTile: boolean;

  /**
   * Initialize the MapLibre PMTiles protocol.
   *
   * * metadata: also load the metadata section of the PMTiles. required for some "inspect" functionality
   * and to automatically populate the map attribution. Requires an extra HTTP request.
   * * errorOnMissingTile: When a vector MVT tile is missing from the archive, raise an error instead of
   * returning the empty array. Not recommended. This is only to reproduce the behavior of ZXY tile APIs
   * which some applications depend on when overzooming.
   */
  constructor(options?: { metadata?: boolean; errorOnMissingTile?: boolean }) {
    this.tiles = new Map<string, PMTiles>();
    this.metadata = options?.metadata || false;
    this.errorOnMissingTile = options?.errorOnMissingTile || false;
  }

  /**
   * Add a {@link PMTiles} instance to the global protocol instance.
   *
   * For remote fetch sources, references in MapLibre styles like pmtiles://http://...
   * will resolve to the same instance if the URLs match.
   */
  add(p: PMTiles) {
    this.tiles.set(p.source.getKey(), p);
  }

  /**
   * Fetch a {@link PMTiles} instance by URL, for remote PMTiles instances.
   */
  get(url: string) {
    return this.tiles.get(url);
  }

  /** @hidden */
  tilev4 = async (
    params: RequestParameters,
    abortController: AbortController
  ) => {
    if (params.type === "json") {
      const pmtilesUrl = params.url.substr(10);
      let instance = this.tiles.get(pmtilesUrl);
      if (!instance) {
        instance = new PMTiles(pmtilesUrl);
        this.tiles.set(pmtilesUrl, instance);
      }

      if (this.metadata) {
        return {
          data: await instance.getTileJson(params.url),
        };
      }

      const h = await instance.getHeader();

      if (h.minLon >= h.maxLon || h.minLat >= h.maxLat) {
        console.error(
          `Bounds of PMTiles archive ${h.minLon},${h.minLat},${h.maxLon},${h.maxLat} are not valid.`
        );
      }

      return {
        data: {
          tiles: [`${params.url}/{z}/{x}/{y}`],
          minzoom: h.minZoom,
          maxzoom: h.maxZoom,
          bounds: [h.minLon, h.minLat, h.maxLon, h.maxLat],
        },
      };
    }
    const re = new RegExp(/pmtiles:\/\/(.+)\/(\d+)\/(\d+)\/(\d+)/);
    const result = params.url.match(re);
    if (!result) {
      throw new Error("Invalid PMTiles protocol URL");
    }
    const pmtilesUrl = result[1];

    let instance = this.tiles.get(pmtilesUrl);
    if (!instance) {
      instance = new PMTiles(pmtilesUrl);
      this.tiles.set(pmtilesUrl, instance);
    }
    const z = result[2];
    const x = result[3];
    const y = result[4];

    const header = await instance.getHeader();
    const resp = await instance?.getZxy(+z, +x, +y, abortController.signal);
    if (resp) {
      return {
        data: new Uint8Array(resp.data),
        cacheControl: resp.cacheControl,
        expires: resp.expires,
      };
    }
    if (header.tileType === TileType.Mvt) {
      if (this.errorOnMissingTile) {
        throw new Error("Tile not found.");
      }
      return { data: new Uint8Array() };
    }
    return { data: null };
  };

  tile = v3compat(this.tilev4);
}
