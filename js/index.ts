import { decompressSync } from "fflate";
import v2 from "./v2";
export * from "./adapters";

export interface BufferPosition {
	buf: Uint8Array;
	pos: number;
}

function toNum(low: number, high: number): number {
	return (high >>> 0) * 0x100000000 + (low >>> 0);
}

function readVarintRemainder(l: number, p: BufferPosition): number {
	const buf = p.buf;
	let h, b;
	b = buf[p.pos++];
	h = (b & 0x70) >> 4;
	if (b < 0x80) return toNum(l, h);
	b = buf[p.pos++];
	h |= (b & 0x7f) << 3;
	if (b < 0x80) return toNum(l, h);
	b = buf[p.pos++];
	h |= (b & 0x7f) << 10;
	if (b < 0x80) return toNum(l, h);
	b = buf[p.pos++];
	h |= (b & 0x7f) << 17;
	if (b < 0x80) return toNum(l, h);
	b = buf[p.pos++];
	h |= (b & 0x7f) << 24;
	if (b < 0x80) return toNum(l, h);
	b = buf[p.pos++];
	h |= (b & 0x01) << 31;
	if (b < 0x80) return toNum(l, h);
	throw new Error("Expected varint not more than 10 bytes");
}

export function readVarint(p: BufferPosition): number {
	const buf = p.buf;
	let val, b;

	b = buf[p.pos++];
	val = b & 0x7f;
	if (b < 0x80) return val;
	b = buf[p.pos++];
	val |= (b & 0x7f) << 7;
	if (b < 0x80) return val;
	b = buf[p.pos++];
	val |= (b & 0x7f) << 14;
	if (b < 0x80) return val;
	b = buf[p.pos++];
	val |= (b & 0x7f) << 21;
	if (b < 0x80) return val;
	b = buf[p.pos];
	val |= (b & 0x0f) << 28;

	return readVarintRemainder(val, p);
}

function rotate(n: number, xy: number[], rx: number, ry: number): void {
	if (ry == 0) {
		if (rx == 1) {
			xy[0] = n - 1 - xy[0];
			xy[1] = n - 1 - xy[1];
		}
		const t = xy[0];
		xy[0] = xy[1];
		xy[1] = t;
	}
}

function idOnLevel(z: number, pos: number): [number, number, number] {
	const n = 1 << z;
	let rx = pos;
	let ry = pos;
	let t = pos;
	const xy = [0, 0];
	let s = 1;
	while (s < n) {
		rx = 1 & ((t / 2) >> 0);
		ry = 1 & (t ^ rx);
		rotate(s, xy, rx, ry);
		xy[0] += s * rx;
		xy[1] += s * ry;
		t = (t / 4) >> 0;
		s *= 2;
	}
	return [z, xy[0], xy[1]];
}

export function zxyToTileId(z: number, x: number, y: number): number {
	let acc = 0;
	let tz = 0;
	while (tz < z) {
		acc += (0x1 << tz) * (0x1 << tz);
		tz++;
	}
	const n = 1 << z;
	let rx = 0;
	let ry = 0;
	let d = 0;
	const xy = [x, y];
	let s = (n / 2) >> 0;
	while (s > 0) {
		rx = (xy[0] & s) > 0 ? 1 : 0;
		ry = (xy[1] & s) > 0 ? 1 : 0;
		d += s * s * ((3 * rx) ^ ry);
		rotate(s, xy, rx, ry);
		s = (s / 2) >> 0;
	}
	return acc + d;
}

export function tileIdToZxy(i: number): [number, number, number] {
	let acc = 0;
	let z = 0;
	for (;;) {
		const num_tiles = (0x1 << z) * (0x1 << z);
		if (acc + num_tiles > i) {
			return idOnLevel(z, i - acc);
		}
		acc += num_tiles;
		z++;
	}
}

export interface Entry {
	tileId: number;
	offset: number;
	length: number;
	runLength: number;
}

const ENTRY_SIZE_BYTES = 32;

export enum Compression {
	Unknown = 0,
	None = 1,
	Gzip = 2,
	Brotli = 3,
	Zstd = 4,
}

function tryDecompress(buf: ArrayBuffer, compression: Compression) {
	if (compression === Compression.None || compression === Compression.Unknown) {
		return buf;
	} else if (compression === Compression.Gzip) {
		return decompressSync(new Uint8Array(buf));
	} else {
		throw Error("Compression method not supported");
	}
}

export enum TileType {
	Unknown = 0,
	Mvt = 1,
	Png = 2,
	Jpeg = 3,
	Webp = 4,
}

const HEADER_SIZE_BYTES = 127;

export interface Header {
	specVersion: number;
	rootDirectoryOffset: number;
	rootDirectoryLength: number;
	jsonMetadataOffset: number;
	jsonMetadataLength: number;
	leafDirectoryOffset: number;
	leafDirectoryLength?: number;
	tileDataOffset: number;
	tileDataLength?: number;
	numAddressedTiles: number;
	numTileEntries: number;
	numTileContents: number;
	clustered: boolean;
	internalCompression: Compression;
	tileCompression: Compression;
	tileType: TileType;
	minZoom: number;
	maxZoom: number;
	minLon: number;
	minLat: number;
	maxLon: number;
	maxLat: number;
	centerZoom: number;
	centerLon: number;
	centerLat: number;
	etag?: string;
}

export function findTile(entries: Entry[], tileId: number): Entry | null {
	let m = 0;
	let n = entries.length - 1;
	while (m <= n) {
		const k = (n + m) >> 1;
		const cmp = tileId - entries[k].tileId;
		if (cmp > 0) {
			m = k + 1;
		} else if (cmp < 0) {
			n = k - 1;
		} else {
			return entries[k];
		}
	}

	// at this point, m > n
	if (n >= 0) {
		if (entries[n].runLength === 0) {
			return entries[n];
		}
		if (tileId - entries[n].tileId < entries[n].runLength) {
			return entries[n];
		}
	}
	return null;
}

export interface RangeResponse {
	data: ArrayBuffer;
	etag?: string;
	expires?: string;
	cacheControl?: string;
}

// In the future this may need to change
// to support ReadableStream to pass to native DecompressionStream API
export interface Source {
	getBytes: (
		offset: number,
		length: number,
		signal?: AbortSignal
	) => Promise<RangeResponse>;

	getKey: () => string;
}

export class FileAPISource implements Source {
	file: File;

	constructor(file: File) {
		this.file = file;
	}

	getKey() {
		return this.file.name;
	}

	async getBytes(offset: number, length: number): Promise<RangeResponse> {
		const blob = this.file.slice(offset, offset + length);
		const a = await blob.arrayBuffer();
		return { data: a };
	}
}

export class FetchSource implements Source {
	url: string;

	constructor(url: string) {
		this.url = url;
	}

	getKey() {
		return this.url;
	}

	async getBytes(
		offset: number,
		length: number,
		signal?: AbortSignal
	): Promise<RangeResponse> {
		let controller;
		if (!signal) {
			// TODO check this works or assert 206
			controller = new AbortController();
			signal = controller.signal;
		}

		const resp = await fetch(this.url, {
			signal: signal,
			headers: { Range: "bytes=" + offset + "-" + (offset + length - 1) },
		});

		if (resp.status >= 300) {
			throw Error("404");
			controller.abort();
		}
		const contentLength = resp.headers.get("Content-Length");
		if (!contentLength || +contentLength !== length) {
			console.error(
				"Content-Length mismatch indicates byte serving not supported; aborting."
			);
			if (controller) controller.abort();
		}

		const a = await resp.arrayBuffer();
		return {
			data: a,
			etag: resp.headers.get("ETag") || undefined,
			cacheControl: resp.headers.get("Cache-Control") || undefined,
			expires: resp.headers.get("Expires") || undefined,
		};
	}
}

export function bytesToHeader(bytes: ArrayBuffer, etag?: string): Header {
	const v = new DataView(bytes);
	return {
		specVersion: 3,
		rootDirectoryOffset: Number(v.getBigUint64(8, true)),
		rootDirectoryLength: Number(v.getBigUint64(16, true)),
		jsonMetadataOffset: Number(v.getBigUint64(24, true)),
		jsonMetadataLength: Number(v.getBigUint64(32, true)),
		leafDirectoryOffset: Number(v.getBigUint64(40, true)),
		leafDirectoryLength: Number(v.getBigUint64(48, true)),
		tileDataOffset: Number(v.getBigUint64(56, true)),
		tileDataLength: Number(v.getBigUint64(64, true)),
		numAddressedTiles: Number(v.getBigUint64(72, true)),
		numTileEntries: Number(v.getBigUint64(80, true)),
		numTileContents: Number(v.getBigUint64(88, true)),
		clustered: v.getUint8(96) === 1,
		internalCompression: v.getUint8(97),
		tileCompression: v.getUint8(98),
		tileType: v.getUint8(99),
		minZoom: v.getUint8(100),
		maxZoom: v.getUint8(101),
		minLon: v.getInt32(102, true) / 10000000,
		minLat: v.getInt32(106, true) / 10000000,
		maxLon: v.getInt32(110, true) / 10000000,
		maxLat: v.getInt32(114, true) / 10000000,
		centerZoom: v.getUint8(118),
		centerLon: v.getInt32(119, true) / 10000000,
		centerLat: v.getInt32(123, true) / 10000000,
		etag: etag,
	};
}

function deserializeIndex(buffer: ArrayBuffer): Entry[] {
	const p = { buf: new Uint8Array(buffer), pos: 0 };
	const numEntries = readVarint(p);

	const entries: Entry[] = [];

	let lastId = 0;
	for (let i = 0; i < numEntries; i++) {
		const v = readVarint(p);
		entries.push({ tileId: lastId + v, offset: 0, length: 0, runLength: 1 });
		lastId += v;
	}

	for (let i = 0; i < numEntries; i++) {
		entries[i].runLength = readVarint(p);
	}

	for (let i = 0; i < numEntries; i++) {
		entries[i].length = readVarint(p);
	}

	for (let i = 0; i < numEntries; i++) {
		const v = readVarint(p);
		if (v === 0 && i > 0) {
			entries[i].offset = entries[i - 1].offset + entries[i - 1].length;
		} else {
			entries[i].offset = v - 1;
		}
	}

	return entries;
}

function detectVersion(a: ArrayBuffer): number {
	const v = new DataView(a);
	if (v.getUint16(2, true) === 2) {
		console.warn(
			"PMTiles spec version 2 has been deprecated; please see github.com/protomaps/PMTiles for tools to upgrade"
		);
		return 2;
	} else if (v.getUint16(2, true) === 1) {
		console.warn(
			"PMTiles spec version 1 has been deprecated; please see github.com/protomaps/PMTiles for tools to upgrade"
		);
		return 1;
	}
	return 3;
}

export class EtagMismatch extends Error {}

export interface Cache {
	getHeader: (source: Source, current_etag?: string) => Promise<Header>;
	getDirectory: (
		source: Source,
		offset: number,
		length: number,
		header: Header
	) => Promise<Entry[]>;
	getArrayBuffer: (
		source: Source,
		offset: number,
		length: number,
		header: Header
	) => Promise<ArrayBuffer>;
	invalidate: (source: Source, current_etag: string) => Promise<void>;
}

async function getHeaderAndRoot(
	source: Source,
	prefetch: boolean,
	current_etag?: string
): Promise<[Header, [string, number, Entry[] | ArrayBuffer]?]> {
	const resp = await source.getBytes(0, 16384);

	const v = new DataView(resp.data);
	if (v.getUint16(0, true) !== 0x4d50) {
		throw new Error("Wrong magic number for PMTiles archive");
	}

	// V2 COMPATIBILITY
	if (detectVersion(resp.data) < 3) {
		return [await v2.getHeader(source)];
	}

	const headerData = resp.data.slice(0, HEADER_SIZE_BYTES);

	let resp_etag = resp.etag;
	if (current_etag && resp.etag != current_etag) {
		console.warn(
			"ETag conflict detected; your HTTP server might not support content-based ETag headers. ETags disabled for " +
				source.getKey()
		);
		resp_etag = undefined;
	}

	const header = bytesToHeader(headerData, resp_etag);

	// optimistically set the root directory
	// TODO check root bounds
	if (prefetch) {
		const rootDirData = resp.data.slice(
			header.rootDirectoryOffset,
			header.rootDirectoryOffset + header.rootDirectoryLength
		);
		const dirKey =
			source.getKey() +
			"|" +
			(header.etag || "") +
			"|" +
			header.rootDirectoryOffset +
			"|" +
			header.rootDirectoryLength;

		const rootDir = deserializeIndex(
			tryDecompress(rootDirData, header.internalCompression)
		);
		return [header, [dirKey, ENTRY_SIZE_BYTES * rootDir.length, rootDir]];
	}

	return [header, undefined];
}

async function getDirectory(
	source: Source,
	offset: number,
	length: number,
	header: Header
): Promise<Entry[]> {
	const resp = await source.getBytes(offset, length);

	if (header.etag && header.etag !== resp.etag) {
		throw new EtagMismatch(resp.etag);
	}

	const data = tryDecompress(resp.data, header.internalCompression);
	const directory = deserializeIndex(data);
	if (directory.length === 0) {
		throw new Error("Empty directory is invalid");
	}

	return directory;
}

interface ResolvedValue {
	lastUsed: number;
	size: number;
	data: Header | Entry[] | ArrayBuffer;
}

export class ResolvedValueCache {
	cache: Map<string, ResolvedValue>;
	sizeBytes: number;
	maxSizeBytes: number;
	counter: number;
	prefetch: boolean;

	constructor(maxSizeBytes = 64000000, prefetch = true) {
		this.cache = new Map<string, ResolvedValue>();
		this.sizeBytes = 0;
		this.maxSizeBytes = maxSizeBytes;
		this.counter = 1;
		this.prefetch = prefetch;
	}

	async getHeader(source: Source, current_etag?: string): Promise<Header> {
		const cacheKey = source.getKey();
		if (this.cache.has(cacheKey)) {
			this.cache.get(cacheKey)!.lastUsed = this.counter++;
			const data = this.cache.get(cacheKey)!.data;
			return data as Header;
		}

		const res = await getHeaderAndRoot(source, this.prefetch, current_etag);
		if (res[1]) {
			this.cache.set(res[1][0], {
				lastUsed: this.counter++,
				size: res[1][1],
				data: res[1][2],
			});
		}

		this.cache.set(cacheKey, {
			lastUsed: this.counter++,
			data: res[0],
			size: HEADER_SIZE_BYTES,
		});
		this.sizeBytes += HEADER_SIZE_BYTES;
		this.prune();
		return res[0];
	}

	async getDirectory(
		source: Source,
		offset: number,
		length: number,
		header: Header
	): Promise<Entry[]> {
		const cacheKey =
			source.getKey() + "|" + (header.etag || "") + "|" + offset + "|" + length;
		if (this.cache.has(cacheKey)) {
			this.cache.get(cacheKey)!.lastUsed = this.counter++;
			const data = this.cache.get(cacheKey)!.data;
			return data as Entry[];
		}

		const directory = await getDirectory(source, offset, length, header);
		this.cache.set(cacheKey, {
			lastUsed: this.counter++,
			data: directory,
			size: ENTRY_SIZE_BYTES * directory.length,
		});
		this.sizeBytes += ENTRY_SIZE_BYTES * directory.length;
		this.prune();
		return directory;
	}

	// for v2 backwards compatibility
	async getArrayBuffer(
		source: Source,
		offset: number,
		length: number,
		header: Header
	): Promise<ArrayBuffer> {
		const cacheKey =
			source.getKey() + "|" + (header.etag || "") + "|" + offset + "|" + length;
		if (this.cache.has(cacheKey)) {
			this.cache.get(cacheKey)!.lastUsed = this.counter++;
			const data = await this.cache.get(cacheKey)!.data;
			return data as ArrayBuffer;
		}

		const resp = await source.getBytes(offset, length);
		if (header.etag && header.etag !== resp.etag) {
			throw new EtagMismatch(header.etag);
		}
		this.cache.set(cacheKey, {
			lastUsed: this.counter++,
			data: resp.data,
			size: resp.data.byteLength,
		});
		this.sizeBytes += resp.data.byteLength;
		this.prune();
		return resp.data;
	}

	prune() {
		while (this.sizeBytes > this.maxSizeBytes) {
			let minUsed = Infinity;
			let minKey = undefined;
			this.cache.forEach((cache_value: ResolvedValue, key: string) => {
				if (cache_value.lastUsed < minUsed) {
					minUsed = cache_value.lastUsed;
					minKey = key;
				}
			});
			if (minKey) {
				this.sizeBytes -= this.cache.get(minKey)!.size;
				this.cache.delete(minKey);
			}
		}
	}

	async invalidate(source: Source, current_etag: string) {
		this.cache.delete(source.getKey());
		await this.getHeader(source, current_etag);
	}
}

interface SharedPromiseCacheValue {
	lastUsed: number;
	size: number; // 0 if the promise has not resolved
	data: Promise<Header | Entry[] | ArrayBuffer>;
}

// a "dumb" bag of bytes.
// only caches headers and directories
// deduplicates simultaneous responses
// (estimates) the maximum size of the cache.
export class SharedPromiseCache {
	cache: Map<string, SharedPromiseCacheValue>;
	sizeBytes: number;
	maxSizeBytes: number;
	counter: number;
	prefetch: boolean;

	constructor(maxSizeBytes = 64000000, prefetch = true) {
		this.cache = new Map<string, SharedPromiseCacheValue>();
		this.sizeBytes = 0;
		this.maxSizeBytes = maxSizeBytes;
		this.counter = 1;
		this.prefetch = prefetch;
	}

	async getHeader(source: Source, current_etag?: string): Promise<Header> {
		const cacheKey = source.getKey();
		if (this.cache.has(cacheKey)) {
			this.cache.get(cacheKey)!.lastUsed = this.counter++;
			const data = await this.cache.get(cacheKey)!.data;
			return data as Header;
		}

		const p = new Promise<Header>((resolve, reject) => {
			getHeaderAndRoot(source, this.prefetch, current_etag)
				.then((res) => {
					if (this.cache.has(cacheKey)) {
						this.cache.get(cacheKey)!.size = HEADER_SIZE_BYTES;
						this.sizeBytes += HEADER_SIZE_BYTES;
					}
					if (res[1]) {
						this.cache.set(res[1][0], {
							lastUsed: this.counter++,
							size: res[1][1],
							data: Promise.resolve(res[1][2]),
						});
					}
					resolve(res[0]);
					this.prune();
				})
				.catch((e) => {
					reject(e);
				});
		});
		this.cache.set(cacheKey, { lastUsed: this.counter++, data: p, size: 0 });
		return p;
	}

	async getDirectory(
		source: Source,
		offset: number,
		length: number,
		header: Header
	): Promise<Entry[]> {
		const cacheKey =
			source.getKey() + "|" + (header.etag || "") + "|" + offset + "|" + length;
		if (this.cache.has(cacheKey)) {
			this.cache.get(cacheKey)!.lastUsed = this.counter++;
			const data = await this.cache.get(cacheKey)!.data;
			return data as Entry[];
		}

		const p = new Promise<Entry[]>((resolve, reject) => {
			getDirectory(source, offset, length, header)
				.then((directory) => {
					resolve(directory);
					if (this.cache.has(cacheKey)) {
						this.cache.get(cacheKey)!.size =
							ENTRY_SIZE_BYTES * directory.length;
						this.sizeBytes += ENTRY_SIZE_BYTES * directory.length;
					}
					this.prune();
				})
				.catch((e) => {
					reject(e);
				});
		});
		this.cache.set(cacheKey, { lastUsed: this.counter++, data: p, size: 0 });
		return p;
	}

	// for v2 backwards compatibility
	async getArrayBuffer(
		source: Source,
		offset: number,
		length: number,
		header: Header
	): Promise<ArrayBuffer> {
		const cacheKey =
			source.getKey() + "|" + (header.etag || "") + "|" + offset + "|" + length;
		if (this.cache.has(cacheKey)) {
			this.cache.get(cacheKey)!.lastUsed = this.counter++;
			const data = await this.cache.get(cacheKey)!.data;
			return data as ArrayBuffer;
		}

		const p = new Promise<ArrayBuffer>((resolve, reject) => {
			source
				.getBytes(offset, length)
				.then((resp) => {
					if (header.etag && header.etag !== resp.etag) {
						throw new EtagMismatch(resp.etag);
					}
					resolve(resp.data);
					if (this.cache.has(cacheKey)) {
						this.cache.get(cacheKey)!.size = resp.data.byteLength;
						this.sizeBytes += resp.data.byteLength;
					}
					this.prune();
				})
				.catch((e) => {
					reject(e);
				});
		});
		this.cache.set(cacheKey, { lastUsed: this.counter++, data: p, size: 0 });
		return p;
	}

	prune() {
		while (this.sizeBytes > this.maxSizeBytes) {
			let minUsed = Infinity;
			let minKey = undefined;
			this.cache.forEach(
				(cache_value: SharedPromiseCacheValue, key: string) => {
					if (cache_value.lastUsed < minUsed) {
						minUsed = cache_value.lastUsed;
						minKey = key;
					}
				}
			);
			if (minKey) {
				this.sizeBytes -= this.cache.get(minKey)!.size;
				this.cache.delete(minKey);
			}
		}
	}

	async invalidate(source: Source, current_etag: string) {
		this.cache.delete(source.getKey());
		await this.getHeader(source, current_etag);
	}
}

export class PMTiles {
	source: Source;
	cache: Cache;

	constructor(source: Source | string, cache?: Cache) {
		if (typeof source === "string") {
			this.source = new FetchSource(source);
		} else {
			this.source = source;
		}
		if (cache) {
			this.cache = cache;
		} else {
			this.cache = new SharedPromiseCache();
		}
	}

	async root_entries() {
		const header = await this.cache.getHeader(this.source);

		// V2 COMPATIBILITY
		if (header.specVersion < 3) {
			return [];
		}
		return await this.cache.getDirectory(
			this.source,
			header.rootDirectoryOffset,
			header.rootDirectoryLength,
			header
		);
	}

	async getHeader() {
		return await this.cache.getHeader(this.source);
	}

	async getZxyAttempt(
		z: number,
		x: number,
		y: number,
		signal?: AbortSignal
	): Promise<RangeResponse | undefined> {
		const tile_id = zxyToTileId(z, x, y);
		const header = await this.cache.getHeader(this.source);

		// V2 COMPATIBILITY
		if (header.specVersion < 3) {
			return v2.getZxy(header, this.source, this.cache, z, x, y, signal);
		}

		if (z < header.minZoom || z > header.maxZoom) {
			return undefined;
		}

		let d_o = header.rootDirectoryOffset;
		let d_l = header.rootDirectoryLength;
		for (let depth = 0; depth <= 3; depth++) {
			const directory = await this.cache.getDirectory(
				this.source,
				d_o,
				d_l,
				header
			);
			const entry = findTile(directory, tile_id);
			if (entry) {
				if (entry.runLength > 0) {
					const resp = await this.source.getBytes(
						header.tileDataOffset + entry.offset,
						entry.length,
						signal
					);
					if (header.etag && header.etag !== resp.etag) {
						throw new EtagMismatch(resp.etag);
					}
					return {
						data: tryDecompress(resp.data, header.tileCompression),
						cacheControl: resp.cacheControl,
						expires: resp.expires,
					};
				} else {
					d_o = header.leafDirectoryOffset + entry.offset;
					d_l = entry.length;
				}
			} else {
				return undefined;
			}
		}
		throw Error("Maximum directory depth exceeded");
	}

	async getZxy(
		z: number,
		x: number,
		y: number,
		signal?: AbortSignal
	): Promise<RangeResponse | undefined> {
		try {
			return await this.getZxyAttempt(z, x, y, signal);
		} catch (e) {
			if (e instanceof EtagMismatch) {
				this.cache.invalidate(this.source, e.name);
				return await this.getZxyAttempt(z, x, y, signal);
			} else {
				throw e;
			}
		}
	}

	async getMetadataAttempt(): Promise<any> {
		const header = await this.cache.getHeader(this.source);

		const resp = await this.source.getBytes(
			header.jsonMetadataOffset,
			header.jsonMetadataLength
		);
		if (header.etag && header.etag !== resp.etag) {
			throw new EtagMismatch(resp.etag);
		}
		const decompressed = tryDecompress(resp.data, header.internalCompression);
		const dec = new TextDecoder("utf-8");
		return JSON.parse(dec.decode(decompressed));
	}

	async getMetadata(): Promise<any> {
		try {
			return await this.getMetadataAttempt();
		} catch (e) {
			if (e instanceof EtagMismatch) {
				this.cache.invalidate(this.source, e.name);
				return await this.getMetadataAttempt();
			} else {
				throw e;
			}
		}
	}
}
