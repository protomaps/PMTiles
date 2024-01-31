import {
  PMTiles,
  Source,
  RangeResponse,
  ResolvedValueCache,
  TileType,
  Compression,
} from "../../../js/index";
import { pmtiles_path, tile_path, tileJSON } from "../../shared/index";

interface Env {
  ALLOWED_ORIGINS?: string;
  BUCKET: R2Bucket;
  CACHE_MAX_AGE?: number;
  PMTILES_PATH?: string;
  PUBLIC_HOSTNAME?: string;
}

class KeyNotFoundError extends Error {
  constructor(message: string) {
    super(message);
  }
}

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

  async getBytes(offset: number, length: number, signal?: AbortSignal, etag?: string): Promise<RangeResponse> {
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
    const { ok, name, tile, ext } = tile_path(url.pathname);

    const cache = caches.default;

    if (ok) {
      let allowed_origin = "";
      if (typeof env.ALLOWED_ORIGINS !== "undefined") {
        for (const o of env.ALLOWED_ORIGINS.split(",")) {
          if (o === request.headers.get("Origin") || o === "*") {
            allowed_origin = o;
          }
        }
      }

      const cached = await cache.match(request.url);
      if (cached) {
        const resp_headers = new Headers(cached.headers);
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
          "max-age=" + (env.CACHE_MAX_AGE || 86400)
        );
        const cacheable = new Response(body, {
          headers: cacheable_headers,
          status: status,
        });

        // normalize HEAD requests
        ctx.waitUntil(cache.put(request.url, cacheable));

        const resp_headers = new Headers(cacheable_headers);
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
          cacheable_headers.set("Content-Type", "application/json");

          const t = tileJSON(
            p_header,
            await p.getMetadata(),
            env.PUBLIC_HOSTNAME || url.hostname,
            name
          );

          return cacheableResponse(JSON.stringify(t), cacheable_headers, 200);
        }

        if (tile[0] < p_header.minZoom || tile[0] > p_header.maxZoom) {
          return cacheableResponse(undefined, cacheable_headers, 404);
        }

        for (const pair of [
          [TileType.Mvt, "mvt"],
          [TileType.Png, "png"],
          [TileType.Jpeg, "jpg"],
          [TileType.Webp, "webp"],
          [TileType.Avif, "avif"],
        ]) {
          if (p_header.tileType === pair[0] && ext !== pair[1]) {
            if (p_header.tileType == TileType.Mvt && ext === "pbf") {
              // allow this for now. Eventually we will delete this in favor of .mvt
              continue;
            }
            return cacheableResponse(
              `Bad request: requested .${ext} but archive has type .${pair[1]}`,
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

    return new Response("Invalid URL", { status: 404 });
  },
};
