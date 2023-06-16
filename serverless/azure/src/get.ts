import { Headers } from "undici";
import { gunzipSync } from "zlib";
import {
  Compression,
  FetchSource,
  PMTiles,
  ResolvedValueCache,
  Source,
  TileType,
} from "../../../js";

class KeyNotFoundError extends Error {
  constructor(message: string) {
    super(message);
  }
}

const TILE =
  /^\/(?<NAME>[0-9a-zA-Z\/!\-_\.\*\'\(\)]+)\/(?<Z>\d+)\/(?<X>\d+)\/(?<Y>\d+).(?<EXT>[a-z]+)$/;

export const tile_path = (
  path: string,
  setting?: string
): {
  ok: boolean;
  name: string;
  tile: [number, number, number];
  ext: string;
} => {
  let pattern = TILE;
  if (setting) {
    // escape regex
    setting = setting.replace(/[.*+?^$()|[\]\\]/g, "\\$&");
    setting = setting.replace("{name}", "(?<NAME>[0-9a-zA-Z/!-_.*'()]+)");
    setting = setting.replace("{z}", "(?<Z>\\d+)");
    setting = setting.replace("{x}", "(?<X>\\d+)");
    setting = setting.replace("{y}", "(?<Y>\\d+)");
    setting = setting.replace("{ext}", "(?<EXT>[a-z]+)");
    pattern = new RegExp(setting);
  }

  let match = path.match(pattern);

  if (match) {
    const g = match.groups!;
    return { ok: true, name: g.NAME, tile: [+g.Z, +g.X, +g.Y], ext: g.EXT };
  }
  return { ok: false, name: "", tile: [0, 0, 0], ext: "" };
};

async function nativeDecompress(
  buf: ArrayBuffer,
  compression: Compression
): Promise<ArrayBuffer> {
  if (compression === Compression.None || compression === Compression.Unknown) {
    return buf;
  } else if (compression === Compression.Gzip) {
    return gunzipSync(buf);
  } else {
    throw Error("Compression method not supported");
  }
}

const CACHE = new ResolvedValueCache(25, undefined, nativeDecompress);

export async function getZxy(
  request: {
    url: string;
    method: string;
    headers: Headers;
  },
  source: Source
): Promise<{ body?: any; status: number }> {
  const url = new URL(request.url);
  const { ok, name, tile, ext } = tile_path(
    url.pathname,
    process.env["TILE_PATH"]
  );

  if (ok) {
    let allowed_origin = "";
    if (typeof process.env["ALLOWED_ORIGINS"] !== "undefined") {
      for (let o of process.env["ALLOWED_ORIGINS"].split(",")) {
        if (o === request.headers.get("Origin") || o === "*") {
          allowed_origin = o;
        }
      }
    }

    const cacheableResponse = (
      body: ArrayBuffer | string | undefined,
      cacheable_headers: Headers,
      status: number
    ) => {
      cacheable_headers.set(
        "Cache-Control",
        "max-age=" + (process.env["CACHE_MAX_AGE"] ?? 86400)
      );

      let resp_headers = new Headers(cacheable_headers);
      if (allowed_origin)
        resp_headers.set("Access-Control-Allow-Origin", allowed_origin);
      resp_headers.set("Vary", "Origin");
      return { body, headers: resp_headers, status: status };
    };

    const cacheableHeaders = new Headers();

    const p = new PMTiles(source, CACHE, nativeDecompress);
    try {
      const p_header = await p.getHeader();
      if (tile[0] < p_header.minZoom || tile[0] > p_header.maxZoom) {
        return cacheableResponse(undefined, cacheableHeaders, 404);
      }

      for (const pair of [
        [TileType.Mvt, "mvt"],
        [TileType.Png, "png"],
        [TileType.Jpeg, "jpg"],
        [TileType.Webp, "webp"],
      ]) {
        if (p_header.tileType === pair[0] && ext !== pair[1]) {
          if (p_header.tileType == TileType.Mvt && ext === "pbf") {
            // allow this for now. Eventually we will delete this in favor of .mvt
            continue;
          }
          return cacheableResponse(
            `Bad request: requested .${ext} but archive has type .${pair[1]}`,
            cacheableHeaders,
            400
          );
        }
      }

      const tileData = await p.getZxy(tile[0], tile[1], tile[2]);

      switch (p_header.tileType) {
        case TileType.Mvt:
          cacheableHeaders.set("Content-Type", "application/x-protobuf");
          break;
        case TileType.Png:
          cacheableHeaders.set("Content-Type", "image/png");
          break;
        case TileType.Jpeg:
          cacheableHeaders.set("Content-Type", "image/jpeg");
          break;
        case TileType.Webp:
          cacheableHeaders.set("Content-Type", "image/webp");
          break;
      }

      if (tileData) {
        return cacheableResponse(tileData.data, cacheableHeaders, 200);
      } else {
        return cacheableResponse(undefined, cacheableHeaders, 204);
      }
    } catch (e) {
      if (e instanceof KeyNotFoundError) {
        return cacheableResponse("Archive not found", cacheableHeaders, 404);
      } else {
        throw e;
      }
    }
  }

  // TODO: metadata responses, tileJSON
  return { body: "Invalid URL", status: 404 };
}
