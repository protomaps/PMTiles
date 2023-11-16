import { HttpResponseInit } from "@azure/functions";
import { Headers } from "undici";
import { gunzipSync } from "zlib";
import {
  Compression,
  PMTiles,
  ResolvedValueCache,
  Source,
  TileType,
} from "pmtiles";

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
    return gunzipSync(buf);
  } else {
    throw Error("Compression method not supported");
  }
}

const CACHE = new ResolvedValueCache(25, undefined, nativeDecompress);

export async function getZxy(
  source: Source,
  tile: [number, number, number],
  ext: string,
  allowed_origin: string,
  requestedEtag: string | null
): Promise<HttpResponseInit> {
  const cacheableResponse = (
    body: ArrayBuffer | string | undefined,
    cacheable_headers: Headers,
    status: number
  ) => {
    let resp_headers = new Headers(cacheable_headers);
    if (allowed_origin)
      resp_headers.set("Access-Control-Allow-Origin", allowed_origin);
    resp_headers.set("Vary", "Origin");
    resp_headers.set(
      "Cache-Control",
      "max-age=" + (process.env["CACHE_MAX_AGE"] ?? 86400)
    );
    return { body, headers: resp_headers, status: status };
  };

  const cacheableHeaders = new Headers();

  const p = new PMTiles(source, CACHE, nativeDecompress);
  try {
    const p_header = await p.getHeader();

    if (requestedEtag && requestedEtag === p_header.etag) {
      return cacheableResponse(undefined, cacheableHeaders, 304);
    }

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

    if (p_header.etag) {
      cacheableHeaders.set("etag", p_header.etag);
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
