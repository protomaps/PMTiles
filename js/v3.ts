import { decompressSync } from "fflate";

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

enum Compression {
	None = 0,
	Gzip = 1,
	Brotli = 2,
	Zstd = 3,
}

function tryDecompress(buf: ArrayBuffer, compression: Compression) {
	if (compression === Compression.None) {
		return buf;
	} else if (compression === Compression.Gzip) {
		return decompressSync(new Uint8Array(buf));
	} else {
		throw Error("Compression method not supported");
	}
}

enum TileType {
	Unknown = 0,
	Mvt = 1,
	Png = 2,
	Jpeg = 3,
	Webp = 4,
}

const HEADER_SIZE_BYTES = 122;

export interface Header {
	rootDirectoryOffset: number;
	rootDirectoryLength: number;
	jsonMetadataOffset: number;
	jsonMetadataLength: number;
	leafDirectoryOffset: number;
	leafDirectoryLength: number;
	tileDataOffset: number;
	tileDataLength: number;
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

export interface Response {
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
	) => Promise<Response>;

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

	async getBytes(offset: number, length: number): Promise<Response> {
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
	): Promise<Response> {
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

interface CacheEntry {
	lastUsed: number;
	size: number; // 0 if the promise has not resolved
	data: Promise<Header | Entry[] | ArrayBuffer>;
}

export function bytesToHeader(bytes: ArrayBuffer, etag?: string): Header {
	const v = new DataView(bytes);
	if (v.getUint16(0, true) !== 0x4d50) {
		throw new Error("Wrong magic number for PMTiles archive");
	}
	return {
		rootDirectoryOffset: Number(v.getBigUint64(3, true)),
		rootDirectoryLength: Number(v.getBigUint64(11, true)),
		jsonMetadataOffset: Number(v.getBigUint64(19, true)),
		jsonMetadataLength: Number(v.getBigUint64(27, true)),
		leafDirectoryOffset: Number(v.getBigUint64(35, true)),
		leafDirectoryLength: Number(v.getBigUint64(43, true)),
		tileDataOffset: Number(v.getBigUint64(51, true)),
		tileDataLength: Number(v.getBigUint64(59, true)),
		numAddressedTiles: Number(v.getBigUint64(67, true)),
		numTileEntries: Number(v.getBigUint64(75, true)),
		numTileContents: Number(v.getBigUint64(83, true)),
		clustered: v.getUint8(91) === 1,
		internalCompression: v.getUint8(92),
		tileCompression: v.getUint8(93),
		tileType: v.getUint8(94),
		minZoom: v.getUint8(95),
		maxZoom: v.getUint8(96),
		minLon: v.getInt32(97, true) / 10000000,
		minLat: v.getInt32(101, true) / 10000000,
		maxLon: v.getInt32(105, true) / 10000000,
		maxLat: v.getInt32(109, true) / 10000000,
		centerZoom: v.getUint8(113),
		centerLon: v.getInt32(114, true) / 10000000,
		centerLat: v.getInt32(118, true) / 10000000,
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

export class VersionMismatch extends Error {}

// a "dumb" bag of bytes.
// only caches headers and directories
// deduplicates simultaneous responses
// (estimates) the maximum size of the cache.
export class Cache {
	cache: Map<string, CacheEntry>;
	sizeBytes: number;
	maxSizeBytes: number;
	counter: number;
	prefetch: boolean;

	constructor(maxSizeBytes = 64000000, prefetch = true) {
		this.cache = new Map<string, CacheEntry>();
		this.sizeBytes = 0;
		this.maxSizeBytes = maxSizeBytes;
		this.counter = 1;
		this.prefetch = prefetch;
	}

	async getHeader(source: Source): Promise<Header> {
		const cacheKey = source.getKey();
		if (this.cache.has(cacheKey)) {
			const data = await this.cache.get(cacheKey)!.data;
			return data as Header;
		}

		const p = new Promise<Header>((resolve, reject) => {
			source
				.getBytes(0, 16384)
				.then((resp) => {
					if (this.cache.has(cacheKey)) {
						this.cache.get(cacheKey)!.size = HEADER_SIZE_BYTES;
						this.sizeBytes += HEADER_SIZE_BYTES;
					}

					const headerData = resp.data.slice(0, HEADER_SIZE_BYTES);
					if (headerData.byteLength !== HEADER_SIZE_BYTES) {
						throw new Error("Invalid PMTiles header");
					}
					const header = bytesToHeader(headerData, resp.etag);

					// optimistically set the root directory
					// TODO check root bounds
					if (this.prefetch) {
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

						this.cache.set(dirKey, {
							lastUsed: this.counter++,
							data: Promise.resolve(rootDir),
							size: ENTRY_SIZE_BYTES * rootDir.length,
						});
					}

					resolve(header);
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
			source
				.getBytes(offset, length)
				.then((resp) => {
					if (header.etag && header.etag !== resp.etag) {
						throw new VersionMismatch("ETag mismatch: " + header.etag);
					}

					const data = tryDecompress(resp.data, header.internalCompression);
					const directory = deserializeIndex(data);
					if (directory.length === 0) {
						return reject(new Error("Empty directory is invalid"));
					}

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

	prune() {
		while (this.sizeBytes > this.maxSizeBytes) {
			let minUsed = Infinity;
			let minKey = undefined;
			this.cache.forEach((cache_entry: CacheEntry, key: string) => {
				if (cache_entry.lastUsed < minUsed) {
					minUsed = cache_entry.lastUsed;
					minKey = key;
				}
			});
			if (minKey) {
				this.sizeBytes -= this.cache.get(minKey)!.size;
				this.cache.delete(minKey);
			}
		}
	}

	invalidate(source: Source) {
		this.cache.delete(source.getKey());
	}
}

export class PMTiles {
	source: Source;
	cache: Cache;

	constructor(source: Source, cache?: Cache) {
		this.source = source;
		if (cache) {
			this.cache = cache;
		} else {
			this.cache = new Cache();
		}
	}

	async root_entries() {
		const header = await this.cache.getHeader(this.source);
		let d_o = header.rootDirectoryOffset;
		let d_l = header.rootDirectoryLength;
		return await this.cache.getDirectory(this.source, d_o, d_l, header);
	}

	async getHeader() {
		return await this.cache.getHeader(this.source);
	}

	async getZxyAttempt(
		z: number,
		x: number,
		y: number,
		signal?: AbortSignal
	): Promise<Response | undefined> {
		const tile_id = zxyToTileId(z, x, y);
		const header = await this.cache.getHeader(this.source);

		if (z < header.minZoom || z > header.maxZoom) {
			return undefined;
		}

		let d_o = header.rootDirectoryOffset;
		let d_l = header.rootDirectoryLength;
		for (let depth = 0; depth < 5; depth++) {
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
						throw new VersionMismatch("ETag mismatch: " + header.etag);
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
	): Promise<Response | undefined> {
		try {
			return await this.getZxyAttempt(z, x, y, signal);
		} catch (e) {
			if (e instanceof VersionMismatch) {
				this.cache.invalidate(this.source);
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
			throw new VersionMismatch("Etag mismatch: " + header.etag);
		}
		const decompressed = tryDecompress(resp.data, header.internalCompression);
		const dec = new TextDecoder("utf-8");
		return JSON.parse(dec.decode(decompressed));
	}

	async getMetadata(): Promise<any> {
		try {
			return await this.getMetadataAttempt();
		} catch (e) {
			if (e instanceof VersionMismatch) {
				this.cache.invalidate(this.source);
				return await this.getMetadataAttempt();
			} else {
				throw e;
			}
		}
	}
}
