import { decompressSync } from "fflate";

function rotate(n: number, xy: number[], rx: number, ry: number): void {
	if (ry == 0) {
		if (rx == 1) {
			xy[0] = n - 1 - xy[0];
			xy[1] = n - 1 - xy[1];
		}
		let t = xy[0];
		xy[0] = xy[1];
		xy[1] = t;
	}
}

function idOnLevel(z: number, pos: number): [number, number, number] {
	let n = 1 << z;
	let rx = pos;
	let ry = pos;
	let t = pos;
	let xy = [0, 0];
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
	let n = 1 << z;
	let rx = 0;
	let ry = 0;
	let d = 0;
	let xy = [x, y];
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
	while (true) {
		let num_tiles = (0x1 << z) * (0x1 << z);
		if (acc + num_tiles > i) {
			return idOnLevel(z, i - acc);
		}
		acc += num_tiles;
		z++;
	}
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

/// not tested below

interface BufferPosition {
	buf: Uint8Array;
	pos: number;
}

function toNum(low: number, high: number): number {
	return (high >>> 0) * 0x100000000 + (low >>> 0);
}

function readVarintRemainder(l: number, p: BufferPosition): number {
	var buf = p.buf,
		h,
		b;
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

function readVarint(p: BufferPosition): number {
	var buf = p.buf,
		val,
		b;

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

// async function decompress(body) {
// 	const ds = new DecompressionStream('gzip');
// 	const decompressedStream = body.body.pipeThrough(ds);
// 	let r = new Response(decompressedStream)
// 	let a = await r.arrayBuffer();
// 	return a;
// }

async function decompress(body: Body): Promise<ArrayBuffer> {
	let a = await body.arrayBuffer();
	let d = decompressSync(new Uint8Array(a));
	return d.buffer;
}

interface Body {
	arrayBuffer: () => Promise<ArrayBuffer>;
	body: ReadableStream<Uint8Array> | null;
}

export interface Entry {
	tileId: number;
	offset: number;
	length: number;
	runLength: number;
}

async function deserializeIndex(body: Body): Promise<Entry[]> {
	let a = await decompress(body);

	let start = performance.now();
	let p = { buf: new Uint8Array(a), pos: 0 };
	let numEntries = readVarint(p);

	let entries: Entry[] = [];

	var lastId = 0;
	for (var i = 0; i < numEntries; i++) {
		let v = readVarint(p);
		entries.push({ tileId: lastId + v, offset: 0, length: 0, runLength: 1 });
		lastId += v;
	}

	for (var i = 0; i < numEntries; i++) {
		entries[i].runLength = readVarint(p);
	}

	for (var i = 0; i < numEntries; i++) {
		entries[i].length = readVarint(p);
	}

	for (var i = 0; i < numEntries; i++) {
		let v = readVarint(p);
		if (v === 0 && i > 0) {
			entries[i].offset = entries[i-1].offset + entries[i-1].length;
		} else {
			entries[i].offset = v - 1;
		}
	}

	console.log("decompress took", performance.now() - start);
	return entries;
}

let URL = 'http://localhost:8500/label_points.pmtiles'

async function getBytes(offset: number, len: number): Promise<Body> {
	let resp = await fetch(URL, {
		headers: { Range: "bytes=" + offset + "-" + (offset + len - 1) },
	});
	return resp;
}

export async function doFunc() {
	let tileId = zxyToTileId(7,0,0);

	let dec = new TextDecoder("utf-8");
	let resp = await getBytes(0, 16384);
	let a = await resp.arrayBuffer();
	var v = new DataView(a);
	var root_offset = Number(v.getBigUint64(3, true));
	var root_len = Number(v.getBigUint64(11, true));

	let leaf_dirs_offset = Number(v.getBigUint64(35,true));
	let tile_data_offset = Number(v.getBigUint64(43,true));

	let min_zoom = v.getUint8(109);
	let max_zoom = v.getUint8(110);
	console.log(min_zoom,max_zoom);

	let min_lon = v.getFloat32(111,true);
	let min_lat = v.getFloat32(115,true);
	let max_lon = v.getFloat32(119,true);
	let max_lat = v.getFloat32(123,true);
	console.log(min_lon, min_lat, max_lon, max_lat);

	// console.log(dec.decode(a.slice(61,61+v.getUint8(60))));
	// console.log(dec.decode(a.slice(72,72+v.getUint8(71))));
	// console.log(dec.decode(a.slice(83,83+v.getUint8(82))));

	let str = await getBytes(root_offset, root_len);
	let idx = await deserializeIndex(str);

	// metadata
	var metadata_offset = Number(v.getBigUint64(19, true));
	var metadata_len = Number(v.getBigUint64(27, true));
	let jm = await getBytes(metadata_offset, metadata_len);
	let jb = await jm.arrayBuffer();
  console.log(JSON.parse(dec.decode(jb)));

	let result = findTile(idx,tileId)
	if (result) {
		if (result.runLength > 0) {

		} else {
			str = await getBytes(leaf_dirs_offset + result.offset, result.length);
			idx = await deserializeIndex(str);
			result = findTile(idx,tileId);
			console.log(result);
		}
	}

}
