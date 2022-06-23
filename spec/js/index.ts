import { decompressSync } from 'fflate';

function rotate (n:number,xy:number[],rx:number,ry:number):void {
	if (ry == 0) {
		if (rx == 1) {
			xy[0] = n - 1 - xy[0]
			xy[1] - n - 1 - xy[1]
		}
		let t = xy[0]
		xy[0] = xy[1]
		xy[1] = t
	}
}

function idOnLevel(z:number,pos:number):[number,number,number] {
	let n = 1 << z;
	let rx = pos;
	let ry = pos;
	let t = pos;
	let xy = [0,0];
	let s = 1;
	while (s < n) {
		rx = 1 & (t / 2 >> 0);
		ry = 1 & (t ^ rx);
		rotate(s,xy,rx,ry);
		xy[0] += s * rx;
		xy[1] += s * ry;
		t = t / 4 >> 0;
		s *= 2;
	}
	return [z,xy[0],xy[1]];
}

export function zxyToTileId (z:number,x:number,y:number):number {
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
	let xy = [x,y];
	let s = n / 2 >> 0;
	while (s > 0) {
		rx = (xy[0] & s) > 0 ? 1 : 0;
		ry = (xy[1] & s) > 0 ? 1 : 0;
		d += s * s * ((3 * rx) ^ ry);
		rotate(s,xy,rx,ry);
		s = (s / 2 >> 0);
	}
	return acc + d;
}

export function tileIdToZxy (i:number):[number,number,number] {
	let acc = 0;
	let z = 0;
	while (true) {
		let num_tiles = (0x1 << z) * (0x1 << z);
		if (acc + num_tiles > i) {
			return idOnLevel(z,i-acc);
		}
		acc += num_tiles;
		z++;
	}
}

/// not tested below

interface BufferPosition {
	buf: Uint8Array;
	pos: number;
}

function toNum(low:number, high:number, isSigned:boolean):number {
  if (isSigned) {
    return high * 0x100000000 + (low >>> 0);
  }
  return ((high >>> 0) * 0x100000000) + (low >>> 0);
}

function readVarintRemainder(l:number, s:boolean, p:BufferPosition):number {
  var buf = p.buf, h, b;
  b = buf[p.pos++]; h  = (b & 0x70) >> 4;  if (b < 0x80) return toNum(l, h, s);
  b = buf[p.pos++]; h |= (b & 0x7f) << 3;  if (b < 0x80) return toNum(l, h, s);
  b = buf[p.pos++]; h |= (b & 0x7f) << 10; if (b < 0x80) return toNum(l, h, s);
  b = buf[p.pos++]; h |= (b & 0x7f) << 17; if (b < 0x80) return toNum(l, h, s);
  b = buf[p.pos++]; h |= (b & 0x7f) << 24; if (b < 0x80) return toNum(l, h, s);
  b = buf[p.pos++]; h |= (b & 0x01) << 31; if (b < 0x80) return toNum(l, h, s);
  throw new Error('Expected varint not more than 10 bytes');
}

function readVarint(p:BufferPosition, isSigned:boolean):number {
  var buf = p.buf, val, b;

  b = buf[p.pos++]; val  =  b & 0x7f;        if (b < 0x80) return val;
  b = buf[p.pos++]; val |= (b & 0x7f) << 7;  if (b < 0x80) return val;
  b = buf[p.pos++]; val |= (b & 0x7f) << 14; if (b < 0x80) return val;
  b = buf[p.pos++]; val |= (b & 0x7f) << 21; if (b < 0x80) return val;
  b = buf[p.pos];   val |= (b & 0x0f) << 28;

  return readVarintRemainder(val, isSigned, p);
}

function readSvarint(p:BufferPosition):number {
    var num = readVarint(p,false);
    return num % 2 === 1 ? (num + 1) / -2 : num / 2; // zigzag encoding
}

// async function decompress(body) {
// 	const ds = new DecompressionStream('gzip');
// 	const decompressedStream = body.body.pipeThrough(ds);
// 	let r = new Response(decompressedStream)
// 	let a = await r.arrayBuffer();
// 	return a;
// }

async function decompress(body:Body):Promise<ArrayBuffer> {
	let a = await body.arrayBuffer();
	let d = decompressSync(new Uint8Array(a));
	return d.buffer;
}

interface Body {
	arrayBuffer: () => Promise<ArrayBuffer>;
	body: ReadableStream<Uint8Array> | null;
}

interface Entry {
	tileId: number;
	offset: number;
	length: number;
	runLength: number;
}


async function deserializeIndex(body:Body):Promise<Entry[]> {
	let start = performance.now();
	let a = await decompress(body);

	let p = {buf:new Uint8Array(a),pos:0}
	let numEntries = readVarint(p,false);

	let idx = new ArrayBuffer(entries*(8+8+4+4))
	let idxview = new DataView(idx);

	// TileId
	var lastId = 0;
	for (var i = 0; i < numEntries; i++) {
		let v = readVarint(p,false);
		idxview.setBigUint64(24*i,BigInt(lastId+v));
		lastId += v;
	}

	// Offset
	var lastOffset = 0;
	for (var i = 0; i < numEntries; i++) {
		let v = readSvarint(p);
		idxview.setBigUint64(24*i+8,BigInt(lastOffset+v-1));
		lastOffset += v;
	}

	// Length
	for (var i = 0; i < numEntries; i++) {
		let v = readVarint(p,false);
		idxview.setUint32(24*i+16,v);
	}

	// RunLength
	for (var i = 0; i < numEntries; i++) {
		let v = readVarint(p,false);
		idxview.setUint32(24*i+20,v);
	}
	console.log("decompress took",performance.now() - start,idx.byteLength);
	return new DataView(idx);
}

// let URL = 'http://localhost:8500/tw.pmtiles'
let URL = 'http://100.78.29.81/planet.pmtiles'
let HEADER_LEN = 83

async function getBytes(offset:number,len:number):Promise<Body> {
	let resp = await fetch(URL,{headers:{Range:'bytes=' + offset + '-' + (offset+len-1)}})
	return resp
}

export async function doFunc() {
	let resp = await getBytes(0,HEADER_LEN);
	let a = await resp.arrayBuffer();
	var v = new DataView(a);
	console.log(v.getUint8(2));
	var root_len = v.getUint32(3,true);
	var metadata_len = v.getUint32(7,true);
	let start = HEADER_LEN
	let str = await getBytes(start,root_len)
	let idx = await deserializeIndex(str);

	// binary search over idxview
	// find the entry in the directory with equal or less than

	// lets just get the first one for now...
	let tileid = idx.getBigUint64(0)
	start = Number(idx.getBigUint64(8))
	let len = idx.getUint32(16)
	str = await getBytes(HEADER_LEN+root_len+metadata_len+start,len)
	idx = await deserializeIndex(str);

	// what is the first entry?
	console.log("id",idx.getBigUint64(0));
	console.log("offset",idx.getBigUint64(8));
	console.log("len",idx.getUint32(16));
	console.log("runlength",idx.getUint32(20));


}