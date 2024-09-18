import {
  APIGatewayProxyEventV2,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import {
  Compression,
  EtagMismatch,
  PMTiles,
  RangeResponse,
  ResolvedValueCache,
  Source,
  TileType,
} from "../../../js/index";
import { pmtiles_path, tile_path } from "../../shared/index";

import { createHash } from "crypto";
import zlib from "zlib";

import {
  GetObjectCommand,
  GetObjectCommandOutput,
  S3Client,
} from "@aws-sdk/client-s3";
import { NodeHttpHandler } from "@smithy/node-http-handler";

// the region should default to the same one as the function
const s3client = new S3Client({
  requestHandler: new NodeHttpHandler({
    connectionTimeout: 500,
    socketTimeout: 500,
  }),
});

async function nativeDecompress(
  buf: ArrayBuffer,
  compression: Compression
): Promise<ArrayBuffer> {
  if (compression === Compression.None || compression === Compression.Unknown) {
    return buf;
  }
  if (compression === Compression.Gzip) {
    return zlib.gunzipSync(buf);
  }
  throw Error("Compression method not supported");
}

// Lambda needs to run with 512MB, empty function takes about 70
const CACHE = new ResolvedValueCache(undefined, undefined, nativeDecompress);

class S3Source implements Source {
  archiveName: string;

  constructor(archiveName: string) {
    this.archiveName = archiveName;
  }

  getKey() {
    return this.archiveName;
  }

  async getBytes(
    offset: number,
    length: number,
    signal?: AbortSignal,
    etag?: string
  ): Promise<RangeResponse> {
    let resp: GetObjectCommandOutput;
    try {
      resp = await s3client.send(
        new GetObjectCommand({
          // biome-ignore lint: aws api
          Bucket: process.env.BUCKET!,
          // biome-ignore lint: aws api
          Key: pmtiles_path(this.archiveName, process.env.PMTILES_PATH),
          // biome-ignore lint: aws api
          Range: "bytes=" + offset + "-" + (offset + length - 1),
          // biome-ignore lint: aws api
          IfMatch: etag,
          // biome-ignore lint: aws api
          RequestPayer: "requester",
        })
      );
    } catch (e: unknown) {
      if (e instanceof Error && (e as Error).name === "PreconditionFailed") {
        throw new EtagMismatch();
      }
      throw e;
    }

    const arr = await resp.Body?.transformToByteArray();

    if (!arr) throw Error("Failed to read S3 response body");

    return {
      data: arr.buffer,
      etag: resp.ETag,
      expires: resp.Expires?.toISOString(),
      cacheControl: resp.CacheControl,
    };
  }
}

interface Headers {
  [key: string]: string;
}

const apiResp = (
  statusCode: number,
  body: string,
  isBase64Encoded = false,
  headers: Headers = {}
): APIGatewayProxyResult => {
  return {
    statusCode: statusCode,
    body: body,
    headers: headers,
    isBase64Encoded: isBase64Encoded,
  };
};

// Assumes event is a API Gateway V2 or Lambda Function URL formatted dict
// and returns API Gateway V2 / Lambda Function dict responses
// Does not work with CloudFront events/Lambda@Edge; see README
export const handlerRaw = async (
  event: APIGatewayProxyEventV2,
  _context: Context,
  tilePostprocess?: (a: ArrayBuffer, t: TileType) => ArrayBuffer
): Promise<APIGatewayProxyResult> => {
  let path: string;
  let isApiGateway = false;
  if (event.pathParameters) {
    isApiGateway = true;
    if (event.pathParameters.proxy) {
      path = `/${event.pathParameters.proxy}`;
    } else {
      return apiResp(500, "Proxy integration missing tile_path parameter");
    }
  } else {
    path = event.rawPath;
  }

  if (!path) {
    return apiResp(500, "Invalid event configuration");
  }

  const headers: Headers = {};

  if (process.env.CORS) {
    headers["Access-Control-Allow-Origin"] = process.env.CORS;
  }

  const { ok, name, tile, ext } = tile_path(path);

  if (!ok) {
    return apiResp(400, "Invalid tile URL", false, headers);
  }

  const source = new S3Source(name);
  const p = new PMTiles(source, CACHE, nativeDecompress);
  try {
    const header = await p.getHeader();

    if (!tile) {
      if (
        !(
          process.env.PUBLIC_HOSTNAME ||
          event.headers["x-distribution-domain-name"]
        )
      ) {
        return apiResp(
          501,
          "PUBLIC_HOSTNAME must be set for TileJSON",
          false,
          headers
        );
      }
      headers["Content-Type"] = "application/json";

      const t = await p.getTileJson(
        `https://${
          process.env.PUBLIC_HOSTNAME ||
          event.headers["x-distribution-domain-name"] ||
          ""
        }/${name}`
      );
      return apiResp(200, JSON.stringify(t), false, headers);
    }

    if (tile[0] < header.minZoom || tile[0] > header.maxZoom) {
      return apiResp(404, "", false, headers);
    }

    for (const pair of [
      [TileType.Mvt, "mvt"],
      [TileType.Png, "png"],
      [TileType.Jpeg, "jpg"],
      [TileType.Webp, "webp"],
      [TileType.Avif, "avif"],
    ]) {
      if (header.tileType === pair[0] && ext !== pair[1]) {
        if (header.tileType === TileType.Mvt && ext === "pbf") {
          // allow this for now. Eventually we will delete this in favor of .mvt
          continue;
        }
        return apiResp(
          400,
          `Bad request: requested .${ext} but archive has type .${pair[1]}`,
          false,
          headers
        );
      }
    }

    const tileResult = await p.getZxy(tile[0], tile[1], tile[2]);
    if (tileResult) {
      switch (header.tileType) {
        case TileType.Mvt:
          // part of the list of Cloudfront compressible types.
          headers["Content-Type"] = "application/vnd.mapbox-vector-tile";
          break;
        case TileType.Png:
          headers["Content-Type"] = "image/png";
          break;
        case TileType.Jpeg:
          headers["Content-Type"] = "image/jpeg";
          break;
        case TileType.Webp:
          headers["Content-Type"] = "image/webp";
          break;
        case TileType.Avif:
          headers["Content-Type"] = "image/avif";
          break;
      }

      let data = tileResult.data;

      if (tilePostprocess) {
        data = tilePostprocess(data, header.tileType);
      }

      headers["Cache-Control"] =
        process.env.CACHE_CONTROL || "public, max-age=86400";

      headers.ETag = `"${createHash("sha256")
        .update(Buffer.from(data))
        .digest("hex")}"`;

      if (isApiGateway) {
        // this is wasted work, but we need to force API Gateway to interpret the Lambda response as binary
        // without depending on clients sending matching Accept: headers in the request.
        const recompressedData = zlib.gzipSync(data);
        headers["Content-Encoding"] = "gzip";
        return apiResp(
          200,
          Buffer.from(recompressedData).toString("base64"),
          true,
          headers
        );
      }
      // returns uncompressed response
      return apiResp(200, Buffer.from(data).toString("base64"), true, headers);
    }
    return apiResp(204, "", false, headers);
  } catch (e) {
    if ((e as Error).name === "AccessDenied") {
      return apiResp(403, "Bucket access unauthorized", false, headers);
    }
    throw e;
  }
};

export const handler = async (
  event: APIGatewayProxyEventV2,
  context: Context
): Promise<APIGatewayProxyResult> => {
  return await handlerRaw(event, context);
};
