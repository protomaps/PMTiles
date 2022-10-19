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
} from "../../../js";

// @ts-ignore
import https from "https";

// @ts-ignore
import s3client from "/var/runtime/node_modules/aws-sdk/clients/s3.js";

const keepAliveAgent = new https.Agent({ keepAlive: true });
const s3 = new s3client({
	region: process.env.BUCKET_REGION!,
	httpOptions: { agent: keepAliveAgent },
});

// TODO: figure out how much memory to allocate
const CACHE = new ResolvedValueCache();

// duplicated code below
export const pmtiles_path = (name: string, setting?: string): string => {
	if (setting) {
		return setting.replace("{name}", name);
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
		const resp = await s3
			.getObject({
				Bucket: process.env.BUCKET!,
				Key: pmtiles_path(this.archive_name, process.env.PMTILES_PATH),
				Range: "bytes=" + offset + "-" + (offset + length - 1),
			})
			.promise();

		return { data: resp!.Body.buffer };
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
	if (process.env.CORS) {
		headers["Access-Control-Allow-Origin"] = process.env.CORS;
	}
	// TODO: extension enforcement and MIME types

	const source = new S3Source(name);
	const p = new PMTiles(source, CACHE);
	try {
		const header = await p.getHeader();
		// TODO optimize by checking min/max zoom, return 404

		headers["Content-Type"] = "application/vnd.vector-tile";

		const tile = await p.getZxy(0, 0, 0);
		if (tile) {
			// returns uncompressed response
			// TODO: may need to special case API gateway to return compressed response with gzip content-encoding header
			return apiResp(
				200,
				Buffer.from(tile.data).toString("base64"),
				true,
				headers
			);
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
