/**
 * - Run `wrangler dev src/index.ts` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `wrangler publish src/index.ts --name my-worker` to publish your worker
 */

import {
  PMTiles,
  Source,
  RangeResponse,
  ResolvedValueCache,
  TileType,
  Compression,
} from "../../../js/index";

interface Env {
  BUCKET: R2Bucket;
  ALLOWED_ORIGINS?: string;
  PMTILES_PATH?: string;
  TILE_PATH?: string;
  TILESET_PATH?: string;
  CACHE_MAX_AGE?: number;
}

class KeyNotFoundError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export const pmtiles_path = (name: string, setting?: string): string => {
  if (setting) {
    return setting.replaceAll("{name}", name);
  }
  return name + ".pmtiles";
};

const TILE =
  /^\/(?<NAME>[0-9a-zA-Z\/!\-_\.\*\'\(\)]+)\/(?<Z>\d+)\/(?<X>\d+)\/(?<Y>\d+).(?<EXT>[a-z]+)$/;

const TILESET = /^\/(?<NAME>[0-9a-zA-Z\/!\-_\.\*\'\(\)]+).json$/;

export const tile_path = (
  path: string,
  tile_setting?: string,
  tileset_setting?: string
): {
  ok: boolean;
  name: string;
  tile?: [number, number, number];
  ext: string;
} => {
  let tile_pattern = TILE;
  if (tile_setting) {
    // escape regex
    tile_setting = tile_setting.replace(/[.*+?^$()|[\]\\]/g, "\\$&");
    tile_setting = tile_setting.replace(
      "{name}",
      "(?<NAME>[0-9a-zA-Z/!-_.*'()]+)"
    );
    tile_setting = tile_setting.replace("{z}", "(?<Z>\\d+)");
    tile_setting = tile_setting.replace("{x}", "(?<X>\\d+)");
    tile_setting = tile_setting.replace("{y}", "(?<Y>\\d+)");
    tile_setting = tile_setting.replace("{ext}", "(?<EXT>[a-z]+)");
    tile_pattern = new RegExp(tile_setting);
  }

  let tile_match = path.match(tile_pattern);

  if (tile_match) {
    const g = tile_match.groups!;
    return { ok: true, name: g.NAME, tile: [+g.Z, +g.X, +g.Y], ext: g.EXT };
  }

  let tileset_pattern = TILESET;
  if (tileset_setting) {
    tileset_setting = tileset_setting.replace(/[.*+?^$()|[\]\\]/g, "\\$&");
    tileset_setting = tileset_setting.replace(
      "{name}",
      "(?<NAME>[0-9a-zA-Z/!-_.*'()]+)"
    );
    tileset_pattern = new RegExp(tileset_setting);
  }

  let tileset_match = path.match(tileset_pattern);

  if (tileset_match) {
    const g = tileset_match.groups!;
    return { ok: true, name: g.NAME, ext: "json" };
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
    let stream = new Response(buf).body!;
    let result = stream.pipeThrough(new DecompressionStream("gzip"));
    return new Response(result).arrayBuffer();
  } else {
    throw Error("Compression method not supported");
  }
}

const CACHE = new ResolvedValueCache(25, undefined, nativeDecompress);

class R2Source implements Source {
  env: Env;
  archive_name: string;

  constructor(env: Env, archive_name: string) {
    this.env = env;
    this.archive_name = archive_name;
  }

  getKey() {
    return this.archive_name;
  }

  async getBytes(offset: number, length: number): Promise<RangeResponse> {
    const resp = await this.env.BUCKET.get(
      pmtiles_path(this.archive_name, this.env.PMTILES_PATH),
      {
        range: { offset: offset, length: length },
      }
    );
    if (!resp) {
      throw new KeyNotFoundError("Archive not found");
    }
    const o = resp as R2ObjectBody;
    const a = await o.arrayBuffer();
    return {
      data: a,
      etag: o.etag,
      cacheControl: o.httpMetadata?.cacheControl,
      expires: o.httpMetadata?.cacheExpiry?.toISOString(),
    };
  }
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    if (request.method.toUpperCase() === "POST")
      return new Response(undefined, { status: 405 });

    const url = new URL(request.url);
    const { ok, name, tile, ext } = tile_path(url.pathname, env.TILE_PATH);

    const cache = caches.default;

    if (ok) {
      let allowed_origin = "";
      if (typeof env.ALLOWED_ORIGINS !== "undefined") {
        for (let o of env.ALLOWED_ORIGINS.split(",")) {
          if (o === request.headers.get("Origin") || o === "*") {
            allowed_origin = o;
          }
        }
      }

      let cached = await cache.match(request.url);
      if (cached) {
        let resp_headers = new Headers(cached.headers);
        if (allowed_origin)
          resp_headers.set("Access-Control-Allow-Origin", allowed_origin);
        resp_headers.set("Vary", "Origin");

        return new Response(cached.body, {
          headers: resp_headers,
          status: cached.status,
        });
      }

      const cacheableResponse = (
        body: ArrayBuffer | string | undefined,
        cacheable_headers: Headers,
        status: number
      ) => {
        cacheable_headers.set(
          "Cache-Control",
          "max-age=" + (env.CACHE_MAX_AGE | 86400)
        );
        let cacheable = new Response(body, {
          headers: cacheable_headers,
          status: status,
        });

        // normalize HEAD requests
        ctx.waitUntil(cache.put(request.url, cacheable));

        let resp_headers = new Headers(cacheable_headers);
        if (allowed_origin)
          resp_headers.set("Access-Control-Allow-Origin", allowed_origin);
        resp_headers.set("Vary", "Origin");
        return new Response(body, { headers: resp_headers, status: status });
      };

      const cacheable_headers = new Headers();
      const source = new R2Source(env, name);
      const p = new PMTiles(source, CACHE, nativeDecompress);
      try {
        const p_header = await p.getHeader();

        if (!tile) {
          const metadata = await p.getMetadata();
          cacheable_headers.set("Content-Type", "application/json");

          let ext = "";
          if (p_header.tileType === TileType.Mvt) {
            ext = ".mvt";
          } else if (p_header.tileType === TileType.Png) {
            ext = ".png";
          } else if (p_header.tileType === TileType.Jpeg) {
            ext = ".jpg";
          } else if (p_header.tileType === TileType.Webp) {
            ext = ".webp";
          }

          // TODO: this needs to be based on the TILE_PATH setting
          metadata.tiles = [
            url.protocol +
              "//" +
              url.hostname +
              "/" +
              name +
              "/{z}/{x}/{y}" +
              ext,
          ];
          metadata.bounds = [
            p_header.minLon,
            p_header.minLat,
            p_header.maxLon,
            p_header.maxLat,
          ];
          metadata.center = [
            p_header.centerLon,
            p_header.centerLat,
            p_header.centerZoom,
          ];
          metadata.maxzoom = p_header.maxZoom;
          metadata.minzoom = p_header.minZoom;
          metadata.scheme = "xyz";
          return cacheableResponse(
            JSON.stringify(metadata),
            cacheable_headers,
            200
          );
        }

        if (tile[0] < p_header.minZoom || tile[0] > p_header.maxZoom) {
          return cacheableResponse(undefined, cacheable_headers, 404);
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
              "Bad request: archive has type ." + pair[1],
              cacheable_headers,
              400
            );
          }
        }

        const tiledata = await p.getZxy(tile[0], tile[1], tile[2]);

        switch (p_header.tileType) {
          case TileType.Mvt:
            cacheable_headers.set("Content-Type", "application/x-protobuf");
            break;
          case TileType.Png:
            cacheable_headers.set("Content-Type", "image/png");
            break;
          case TileType.Jpeg:
            cacheable_headers.set("Content-Type", "image/jpeg");
            break;
          case TileType.Webp:
            cacheable_headers.set("Content-Type", "image/webp");
            break;
        }

        if (tiledata) {
          return cacheableResponse(tiledata.data, cacheable_headers, 200);
        } else {
          return cacheableResponse(undefined, cacheable_headers, 204);
        }
      } catch (e) {
        if (e instanceof KeyNotFoundError) {
          return cacheableResponse("Archive not found", cacheable_headers, 404);
        } else {
          throw e;
        }
      }
    }

    // TODO: metadata responses, tileJSON
    return new Response("Invalid URL", { status: 404 });
  },
};
