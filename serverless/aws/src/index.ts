import { Readable } from "stream";
import {
	Context,
	APIGatewayProxyResult,
	APIGatewayProxyEventV2,
} from "aws-lambda";
import {
	PMTiles,
	ResolvedValueCache,
	RangeResponse,
	Source,
	Compression,
	TileType,
} from "../../../js/index";

import https from "https";
import zlib from "zlib";

import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { NodeHttpHandler } from "@aws-sdk/node-http-handler";

// the region should default to the same one as the function
const s3client = new S3Client({requestHandler:new NodeHttpHandler({
	connectionTimeout: 500,
	socketTimeout: 500
})});

async function nativeDecompress(
	buf: ArrayBuffer,
	compression: Compression
): Promise<ArrayBuffer> {
	if (compression === Compression.None || compression === Compression.Unknown) {
		return buf;
	} else if (compression === Compression.Gzip) {
		return zlib.gunzipSync(buf);
	} else {
		throw Error("Compression method not supported");
	}
}

// Lambda needs to run with 512MB, empty function takes about 70
const CACHE = new ResolvedValueCache(undefined, undefined, nativeDecompress);

// duplicated code below
export const pmtiles_path = (name: string, setting?: string): string => {
	if (setting) {
		return setting.replaceAll("{name}", name);
	}
	return name + ".pmtiles";
};

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

class S3Source implements Source {
	archive_name: string;

	constructor(archive_name: string) {
		this.archive_name = archive_name;
	}

	getKey() {
		return "";
	}

	async getBytes(offset: number, length: number): Promise<RangeResponse> {
		const resp = await s3client.send(
			new GetObjectCommand({
				Bucket: process.env.BUCKET!,
				Key: pmtiles_path(this.archive_name, process.env.PMTILES_PATH),
				Range: "bytes=" + offset + "-" + (offset + length - 1),
			})
		);

		const arr = await resp.Body!.transformToByteArray();

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
export const handler = async (
	event: APIGatewayProxyEventV2,
	context: Context
): Promise<APIGatewayProxyResult> => {
	var path;
	var is_api_gateway;
	if (event.pathParameters) {
		is_api_gateway = true;
		if (event.pathParameters.proxy) {
			path = "/" + event.pathParameters.proxy;
		} else {
			return apiResp(500, "Proxy integration missing tile_path parameter");
		}
	} else {
		path = event.rawPath;
	}

	if (!path) {
		return apiResp(500, "Invalid event configuration");
	}

	const { ok, name, tile, ext } = tile_path(path, process.env.TILE_PATH);

	if (!ok) {
		return apiResp(400, "Invalid tile URL");
	}

	var headers: Headers = {};
	// TODO: metadata and TileJSON

	if (process.env.CORS) {
		headers["Access-Control-Allow-Origin"] = process.env.CORS;
	}

	const source = new S3Source(name);
	const p = new PMTiles(source, CACHE, nativeDecompress);
	try {
		const header = await p.getHeader();
		if (tile[0] < header.minZoom || tile[0] > header.maxZoom) {
			return apiResp(404, "");
		}

		for (const pair of [
			[TileType.Mvt, "mvt"],
			[TileType.Png, "png"],
			[TileType.Jpeg, "jpg"],
			[TileType.Webp, "webp"],
		]) {
			if (header.tileType === pair[0] && ext !== pair[1]) {
				if (header.tileType == TileType.Mvt && ext === "pbf") {
					// allow this for now. Eventually we will delete this in favor of .mvt
					continue;
				}
				return apiResp(
					400,
					"Bad request: archive has type ." + pair[1],
					false,
					headers
				);
			}
		}

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
		}

		const tile_result = await p.getZxy(tile[0], tile[1], tile[2]);
		if (tile_result) {
			if (is_api_gateway) {
				// this is wasted work, but we need to force API Gateway to interpret the Lambda response as binary
				// without depending on clients sending matching Accept: headers in the request.
				const recompressed_data = zlib.gzipSync(tile_result.data);
				headers["Content-Encoding"] = "gzip";
				return apiResp(
					200,
					Buffer.from(recompressed_data).toString("base64"),
					true,
					headers
				);
			} else {
				// returns uncompressed response
				return apiResp(
					200,
					Buffer.from(tile_result.data).toString("base64"),
					true,
					headers
				);
			}
		} else {
			return apiResp(204, "", false, headers);
		}
	} catch (e) {
		if ((e as Error).name === "AccessDenied") {
			return apiResp(403, "Bucket access unauthorized");
		}
		throw e;
	}
	return apiResp(404, "Invalid URL");
};
