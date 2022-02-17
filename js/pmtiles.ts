export const shift = (n: number, shift: number) => {
	return n * Math.pow(2, shift);
};

export const unshift = (n: number, shift: number) => {
	return Math.floor(n / Math.pow(2, shift));
};

export const getUint24 = (view: DataView, pos: number) => {
	return shift(view.getUint16(pos + 1, true), 8) + view.getUint8(pos);
};

export const getUint48 = (view: DataView, pos: number) => {
	return shift(view.getUint32(pos + 2, true), 16) + view.getUint16(pos, true);
};

const compare = (
	tz: number,
	tx: number,
	ty: number,
	view: DataView,
	i: number
) => {
	if (tz != view.getUint8(i)) return tz - view.getUint8(i);
	var x = getUint24(view, i + 1);
	if (tx != x) return tx - x;
	var y = getUint24(view, i + 4);
	if (ty != y) return ty - y;
	return 0;
};

export const queryLeafdir = (
	view: DataView,
	z: number,
	x: number,
	y: number
): Entry | null => {
	let offset_len = queryView(view, z | 0x80, x, y);
	if (offset_len) {
		return {
			z: z,
			x: x,
			y: y,
			offset: offset_len[0],
			length: offset_len[1],
			is_dir: true,
		};
	}
	return null;
};

export const queryTile = (view: DataView, z: number, x: number, y: number) => {
	let offset_len = queryView(view, z, x, y);
	if (offset_len) {
		return {
			z: z,
			x: x,
			y: y,
			offset: offset_len[0],
			length: offset_len[1],
			is_dir: false,
		};
	}
	return null;
};

const queryView = (
	view: DataView,
	z: number,
	x: number,
	y: number
): [number, number] | null => {
	var m = 0;
	var n = view.byteLength / 17 - 1;
	while (m <= n) {
		var k = (n + m) >> 1;
		var cmp = compare(z, x, y, view, k * 17);
		if (cmp > 0) {
			m = k + 1;
		} else if (cmp < 0) {
			n = k - 1;
		} else {
			return [
				getUint48(view, k * 17 + 7),
				view.getUint32(k * 17 + 13, true),
			];
		}
	}
	return null;
};

const entrySort = (a: Entry, b: Entry): number => {
	if (a.is_dir && !b.is_dir) {
		return 1;
	}
	if (!a.is_dir && b.is_dir) {
		return -1;
	}
	if (a.z !== b.z) {
		return a.z - b.z;
	}
	if (a.x !== b.x) {
		return a.x - b.x;
	}
	return a.y - b.y;
};

export const createDirectory = (entries: Entry[]): ArrayBuffer => {
	entries.sort(entrySort);

	let buffer = new ArrayBuffer(17 * entries.length);
	let arr = new Uint8Array(buffer);
	for (var i = 0; i < entries.length; i++) {
		var entry = entries[i];
		var z = entry.z;
		if (entry.is_dir) z = z | 0x80;
		arr[i * 17] = z;

		arr[i * 17 + 1] = entry.x & 0xff;
		arr[i * 17 + 2] = (entry.x >> 8) & 0xff;
		arr[i * 17 + 3] = (entry.x >> 16) & 0xff;

		arr[i * 17 + 4] = entry.y & 0xff;
		arr[i * 17 + 5] = (entry.y >> 8) & 0xff;
		arr[i * 17 + 6] = (entry.y >> 16) & 0xff;

		arr[i * 17 + 7] = entry.offset & 0xff;
		arr[i * 17 + 8] = unshift(entry.offset, 8) & 0xff;
		arr[i * 17 + 9] = unshift(entry.offset, 16) & 0xff;
		arr[i * 17 + 10] = unshift(entry.offset, 24) & 0xff;
		arr[i * 17 + 11] = unshift(entry.offset, 32) & 0xff;
		arr[i * 17 + 12] = unshift(entry.offset, 48) & 0xff;

		arr[i * 17 + 13] = entry.length & 0xff;
		arr[i * 17 + 14] = (entry.length >> 8) & 0xff;
		arr[i * 17 + 15] = (entry.length >> 16) & 0xff;
		arr[i * 17 + 16] = (entry.length >> 24) & 0xff;
	}
	return buffer;
};

interface Zxy {
	z: number;
	x: number;
	y: number;
}

// handle different leaf levels
export const deriveLeaf = (tile: Zxy): Zxy => {
	let z7_tile_diff = tile.z - 7;
	let z7_x = Math.trunc(tile.x / (1 << z7_tile_diff));
	let z7_y = Math.trunc(tile.y / (1 << z7_tile_diff));
	return { z: 7, x: z7_x, y: z7_y };
};

// needed to convert a spec v1 to a spec v2
const sortEntries = (dataview: DataView): ArrayBuffer => {
	return new ArrayBuffer(0);
};

interface Header {
	version: number;
	json_size: number;
	root_entries: number;
}

interface Root {
	header: Header;
	buffer: ArrayBuffer;
	dir: DataView;
	// etag: string | null;
}

export interface Entry {
	z: number;
	x: number;
	y: number;
	offset: number;
	length: number;
	is_dir: boolean;
}

interface CachedLeaf {
	lastUsed: number;
	buffer: Promise<ArrayBuffer>;
}

export const parseHeader = (dataview: DataView): Header => {
	var magic = dataview.getUint16(0, true);
	if (magic !== 19792) {
		throw new Error('File header does not begin with "PM"');
	}
	var version = dataview.getUint16(2, true);
	var json_size = dataview.getUint32(4, true);
	var root_entries = dataview.getUint16(8, true);
	return {
		version: version,
		json_size: json_size,
		root_entries: root_entries,
	};
};

export class PMTiles {
	root: Promise<Root> | null;
	url: string;
	leaves: Map<number, CachedLeaf>;
	maxLeaves: number;

	constructor(url: string, maxLeaves: number = 64) {
		this.root = null;
		this.url = url;
		this.leaves = new Map<number, CachedLeaf>();
		this.maxLeaves = maxLeaves;
	}

	fetchRoot = async (url: string): Promise<Root> => {
		const controller = new AbortController();
		const signal = controller.signal;
		let resp = await fetch(url, {
			signal: signal,
			headers: { Range: "bytes=0-511999" },
		});
		let contentLength = resp.headers.get("Content-Length");
		if (!contentLength || +contentLength !== 512000) {
			console.error(
				"Content-Length mismatch indicates byte serving not supported; aborting."
			);
			controller.abort();
		}

		let a = await resp.arrayBuffer();
		let header = parseHeader(new DataView(a, 0, 10));
		return {
			buffer: a,
			header: header,
			dir: new DataView(
				a,
				10 + header.json_size,
				17 * header.root_entries
			),
		};
	};

	getRoot = async (): Promise<Root> => {
		if (this.root) return this.root;
		this.root = this.fetchRoot(this.url);
		return this.root;
	};

	metadata = async (): Promise<any> => {
		let root = await this.getRoot();
		let dec = new TextDecoder("utf-8");
		let result = JSON.parse(
			dec.decode(new DataView(root.buffer, 10, root.header.json_size))
		);
		if (result.compression) {
			console.error(
				`Archive has compression type: ${result.compression} and may not be readable directly by browsers.`
			);
		}
		return result;
	};

	fetchLeafdir = async (entry: Entry): Promise<ArrayBuffer> => {
		let resp = await fetch(this.url, {
			headers: {
				Range:
					"bytes=" +
					entry.offset +
					"-" +
					(entry.offset + entry.length - 1),
			},
		});
		return await resp.arrayBuffer();
	};

	getLeafdir = async (entry: Entry): Promise<ArrayBuffer> => {
		let leaf = this.leaves.get(entry.offset);
		if (leaf) return await leaf.buffer;

		let buf = this.fetchLeafdir(entry);
		this.leaves.set(entry.offset, {
			lastUsed: performance.now(),
			buffer: buf,
		});
		if (this.leaves.size > this.maxLeaves) {
			var minUsed = Infinity;
			var minKey = undefined;
			this.leaves.forEach((val, key) => {
				if (val.lastUsed < minUsed) {
					minUsed = val.lastUsed;
					minKey = key;
				}
			});
			if (minKey) this.leaves.delete(minKey);
		}
		return await buf;
	};

	getZxy = async (z: number, x: number, y: number): Promise<Entry | null> => {
		let root = await this.getRoot();
		let entry = queryTile(root.dir, z, x, y);
		if (entry) return entry;

		let leafcoords = deriveLeaf({ z: z, x: x, y: y });
		let leafdir_entry = queryLeafdir(
			root.dir,
			leafcoords.z,
			leafcoords.x,
			leafcoords.y
		);

		if (leafdir_entry) {
			let leafdir = await this.getLeafdir(leafdir_entry);
			return queryTile(new DataView(leafdir), z, x, y);
		}
		return null;
	};
}

export const addProtocol = (maplibregl: any) => {
	let re = new RegExp(/pmtiles:\/\/(.+)\/(\d+)\/(\d+)\/(\d+)/);
	let pmtiles_instances = new Map<string, PMTiles>();
	maplibregl.addProtocol("pmtiles", (params: any, callback: any) => {
		let result = params.url.match(re);
		let pmtiles_url = result[1];

		var instance = pmtiles_instances.get(pmtiles_url);
		if (!instance) {
			instance = new PMTiles(pmtiles_url);
			pmtiles_instances.set(pmtiles_url, instance);
		}
		let z = result[2];
		let x = result[3];
		let y = result[4];
		var cancel = () => {};

		instance.getZxy(+z, +x, +y).then((val) => {
			if (val) {
				let headers = {
					Range:
						"bytes=" +
						val.offset +
						"-" +
						(val.offset + val.length - 1),
				};
				const controller = new AbortController();
				const signal = controller.signal;
				cancel = () => {
					controller.abort();
				};
				fetch(pmtiles_url, { signal: signal, headers: headers })
					.then((resp) => {
						return resp.arrayBuffer();
					})
					.then((arr) => {
						callback(null, arr, null, null);
					})
					.catch((e) => {
						callback(new Error("Canceled"), null, null, null);
					});
			} else {
				callback(null, new Uint8Array(), null, null);
			}
		});
		return {
			cancel: () => {
				cancel();
			},
		};
	});
	return pmtiles_instances;
};
