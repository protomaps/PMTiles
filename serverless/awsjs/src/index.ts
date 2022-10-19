import { Readable } from "stream";
import { Context, APIGatewayProxyResult, APIGatewayEvent } from "aws-lambda";
import {
	PMTiles,
	ResolvedValueCache,
	RangeResponse,
	Source,
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
				Key: this.archive_name + ".pmtiles",
				Range: "bytes=" + offset + "-" + (offset + length - 1),
			})
			.promise();

		return { data: resp!.Body.buffer };
	}
}

export const handler = async (
	event: APIGatewayEvent,
	context: Context
): Promise<APIGatewayProxyResult> => {
	try {
		const source = new S3Source("stamen_toner_z3");
		const p = new PMTiles(source, CACHE);

		const tile = await p.getZxy(0, 0, 0);
		if (tile) {
			return {
				statusCode: 200,
				body: Buffer.from(tile.data).toString("base64"),
			};
		} else {
			return {
				statusCode: 204,
				body: "",
			};
		}
	} catch (e) {
		if ((e as Error).name === "AccessDenied") {
			return {
				statusCode: 403,
				body: "Bucket access failed: Unauthorized",
			};
		}
		throw e;
	}
	return {
		statusCode: 404,
		body: "Invalid URL",
	};
};
