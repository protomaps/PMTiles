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
} from "../../../js";

interface Env {
	BUCKET: R2Bucket;
	PMTILES_PATH?: string;
	TILE_PATH?: string;
}

class KeyNotFoundError extends Error {
	constructor(message: string) {
		super(message);
	}
}

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

const CACHE = new ResolvedValueCache();

class R2Source implements Source {
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
		const {ok, name, tile, ext} = tile_path(url.pathname, env.TILE_PATH);

		if (ok) {
			const source = new R2Source(env, name);
			const p = new PMTiles(source, CACHE);

			let header = await p.getHeader();

			for (const pair of [
				[TileType.Mvt, "mvt"],
				[TileType.Png, "png"],
				[TileType.Jpeg, "jpg"],
				[TileType.Webp, "webp"],
			]) {
				if (header.tileType === pair[0] && ext !== pair[1]) {
					return new Response("Bad request: archive has type ." + pair[1], {
						status: 400,
					});
				}
			}

			// TODO: optimize by checking header min/maxzoom
			try {
				const tiledata = await p.getZxy(tile[0], tile[1], tile[2]);
				const headers = new Headers();
				headers.set("Access-Control-Allow-Origin", "*"); // TODO: make configurable

				switch (header.tileType) {
					case TileType.Mvt:
						headers.set("Content-Type", "application/vnd.vector-tile");
						break;
					case TileType.Png:
						headers.set("Content-Type", "image/png");
						break;
					case TileType.Jpeg:
						headers.set("Content-Type", "image/jpeg");
						break;
					case TileType.Webp:
						headers.set("Content-Type", "image/webp");
						break;
				}

				// TODO: optimize by making decompression optional
				if (tiledata) {
					return new Response(tiledata.data, { headers: headers, status: 200 });
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
		return new Response("Invalid URL", { status: 404 });
	},
};
