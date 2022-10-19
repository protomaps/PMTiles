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
} from "../../../js";

export interface Env {
	BUCKET: R2Bucket;
	PMTILES_PATH?: string;
}

class KeyNotFoundError extends Error {
	constructor(message: string) {
		super(message);
	}
}

const TILE = new RegExp(
	/^\/([0-9a-zA-Z\/!\-_\.\*\'\(\)]+)\/(\d+)\/(\d+)\/(\d+).([a-z]+)$/
);

export const pmtiles_path = (p: string | undefined, name: string): string => {
	if (p) {
		return p.replace("{name}", name);
	}
	return name + ".pmtiles";
};

const CACHE = new ResolvedValueCache();

export class R2Source implements Source {
	env: Env;
	archive_name: string;

	constructor(env: Env, archive_name: string) {
		this.env = env;
		this.archive_name = archive_name;
	}

	getKey() {
		return "";
	}

	async getBytes(offset: number, length: number): Promise<RangeResponse> {
		const resp = await this.env.BUCKET.get(
			pmtiles_path(this.env.PMTILES_PATH, this.archive_name),
			{
				range: { offset: offset, length: length },
			}
		);
		if (!resp) {
			throw new KeyNotFoundError("Archive not found");
		}
		const o = resp as R2ObjectBody;
		const a = await o.arrayBuffer();
		return { data: a, etag: o.etag };
	}
}

export default {
	async fetch(
		request: Request,
		env: Env,
		ctx: ExecutionContext
	): Promise<Response> {
		const url = new URL(request.url);
		const match = url.pathname.match(TILE)!;

		if (match) {
			const archive_name = match[1];
			const z = +match[2];
			const x = +match[3];
			const y = +match[4];
			const ext = match[5];
			const source = new R2Source(env, archive_name);
			const p = new PMTiles(source, CACHE);

			// TODO: optimize by checking header min/maxzoom
			// TODO: enforce extensions and MIME type using header information
			try {
				const tile = await p.getZxy(z, x, y);
				const headers = new Headers();
				headers.set("Access-Control-Allow-Origin", "*"); // TODO: make configurable
				headers.set("Content-Type", "application/protobuf");

				// TODO: optimize by making decompression optional
				if (tile) {
					return new Response(tile.data, { headers: headers, status: 200 });
				} else {
					return new Response(undefined, { headers: headers, status: 204 });
				}
			} catch (e) {
				if (e instanceof KeyNotFoundError) {
					return new Response("Archive not found", { status: 404 });
				} else {
					throw e;
				}
			}
		}

		// TODO: metadata responses
		return new Response("Invalid URL", { status: 400 });
	},
};
