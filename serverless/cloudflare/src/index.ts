import {
  Compression,
  EtagMismatch,
  PMTiles,
  RangeResponse,
  ResolvedValueCache,
  Source,
  TileType,
} from "../../../js/index";
import { pmtiles_path, tileJSON, tile_path } from "../../shared/index";

interface Env {
  // biome-ignore lint: config name
  ALLOWED_ORIGINS?: string;
  // biome-ignore lint: config name
  BUCKET: R2Bucket;
  // biome-ignore lint: config name
  CACHE_CONTROL?: string;
  // biome-ignore lint: config name
  PMTILES_PATH?: string;
  // biome-ignore lint: config name
  PUBLIC_HOSTNAME?: string;
}

class KeyNotFoundError extends Error {}

const CACHE = new ResolvedValueCache(25, undefined, nativeDecompress);

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    if (request.method.toUpperCase() === "POST") {
      return new Response(undefined, { status: 405 });
    }

    const url = new URL(request.url);
    const { ok, name, tile, ext } = tile_path(url.pathname);

    const cache = caches.default;

    if (!ok) {
      return new Response("Invalid URL", { status: 404 });
    }

    const originHeader = request.headers.get("Origin");
    const allowedOrigins = env.ALLOWED_ORIGINS || "";

    const allowedOrigin = allowedOrigins
      .split(",")
      .find((origin) => origin === originHeader || origin === "*");

    const cached = await cache.match(request.url);
    if (cached) {
      const responseHeaders = new Headers(cached.headers);
      responseHeaders.set("Vary", "Origin");

      if (allowedOrigin) {
        responseHeaders.set("Access-Control-Allow-Origin", allowedOrigin);
      }

      return new Response(cached.body, {
        headers: responseHeaders,
        status: cached.status,
      });
    }

    const cacheableResponse = (
      body: ArrayBuffer | string | undefined,
      cacheableHeaders: Headers,
      status: number
    ) => {
      cacheableHeaders.set(
        "Cache-Control",
        env.CACHE_CONTROL || "public, max-age=86400"
      );

      const cacheable = new Response(body, {
        headers: cacheableHeaders,
        status: status,
      });

      ctx.waitUntil(cache.put(request.url, cacheable));

      const responseHeaders = new Headers(cacheableHeaders);
      responseHeaders.set("Vary", "Origin");

      if (allowedOrigin) {
        responseHeaders.set("Access-Control-Allow-Origin", allowedOrigin);
      }

      return new Response(body, { headers: responseHeaders, status: status });
    };

    const cacheableHeaders = new Headers();
    const source = new R2Source(env, name);
    const pmtiles = new PMTiles(source, CACHE, nativeDecompress);

    try {
      const pHeader = await pmtiles.getHeader();

      if (!tile) {
        cacheableHeaders.set("Content-Type", "application/json");

        const tileJson = tileJSON(
          pHeader,
          await pmtiles.getMetadata(),
          env.PUBLIC_HOSTNAME || url.hostname,
          name
        );

        return cacheableResponse(
          JSON.stringify(tileJson),
          cacheableHeaders,
          200
        );
      }

      if (tile[0] < pHeader.minZoom || tile[0] > pHeader.maxZoom) {
        return cacheableResponse(undefined, cacheableHeaders, 404);
      }

      for (const pair of [
        [TileType.Mvt, "mvt"],
        [TileType.Png, "png"],
        [TileType.Jpeg, "jpg"],
        [TileType.Webp, "webp"],
        [TileType.Avif, "avif"],
      ]) {
        if (pHeader.tileType === pair[0] && ext !== pair[1]) {
          if (pHeader.tileType === TileType.Mvt && ext === "pbf") {
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

      const tiledata = await pmtiles.getZxy(tile[0], tile[1], tile[2]);

      switch (pHeader.tileType) {
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

      if (tiledata) {
        return cacheableResponse(tiledata.data, cacheableHeaders, 200);
      }

      return cacheableResponse(undefined, cacheableHeaders, 204);
    } catch (error) {
      if (error instanceof KeyNotFoundError) {
        return cacheableResponse("Archive not found", cacheableHeaders, 404);
      }

      throw error;
    }
  },
};

async function nativeDecompress(
  buffer: ArrayBuffer,
  compression: Compression
): Promise<ArrayBuffer> {
  if (compression === Compression.None || compression === Compression.Unknown) {
    return buffer;
  }

  if (compression === Compression.Gzip) {
    const stream = new Response(buffer).body;
    const result = stream?.pipeThrough(new DecompressionStream("gzip"));
    return new Response(result).arrayBuffer();
  }

  throw Error("Compression method not supported");
}

class R2Source implements Source {
  env: Env;
  archiveName: string;

  constructor(env: Env, archiveName: string) {
    this.env = env;
    this.archiveName = archiveName;
  }

  getKey() {
    return this.archiveName;
  }

  async getBytes(
    offset: number,
    length: number,
    _signal?: AbortSignal,
    etag?: string
  ): Promise<RangeResponse> {
    const response = await this.env.BUCKET.get(
      pmtiles_path(this.archiveName, this.env.PMTILES_PATH),
      {
        range: { offset: offset, length: length },
        onlyIf: { etagMatches: etag },
      }
    );

    if (!response) {
      throw new KeyNotFoundError("Archive not found");
    }

    if (!("body" in response) || !response.body) {
      throw new EtagMismatch();
    }

    return {
      data: await response.arrayBuffer(),
      etag: response.etag,
      cacheControl: response.httpMetadata?.cacheControl,
      expires: response.httpMetadata?.cacheExpiry?.toISOString(),
    };
  }
}
