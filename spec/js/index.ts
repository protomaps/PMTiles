import { decompressSync } from 'fflate';

export class PMTilesV3 {

}

function toNum(low:number, high:number, isSigned:boolean) {
  if (isSigned) {
    return high * 0x100000000 + (low >>> 0);
  }
  return ((high >>> 0) * 0x100000000) + (low >>> 0);
}

function readVarintRemainder(l:number, s:boolean, p:BufferPosition) {
  var buf = p.buf, h, b;
  b = buf[p.pos++]; h  = (b & 0x70) >> 4;  if (b < 0x80) return toNum(l, h, s);
  b = buf[p.pos++]; h |= (b & 0x7f) << 3;  if (b < 0x80) return toNum(l, h, s);
  b = buf[p.pos++]; h |= (b & 0x7f) << 10; if (b < 0x80) return toNum(l, h, s);
  b = buf[p.pos++]; h |= (b & 0x7f) << 17; if (b < 0x80) return toNum(l, h, s);
  b = buf[p.pos++]; h |= (b & 0x7f) << 24; if (b < 0x80) return toNum(l, h, s);
  b = buf[p.pos++]; h |= (b & 0x01) << 31; if (b < 0x80) return toNum(l, h, s);
  throw new Error('Expected varint not more than 10 bytes');
}

function readVarint(p:BufferPosition, isSigned:boolean) {
  var buf = p.buf, val, b;

  b = buf[p.pos++]; val  =  b & 0x7f;        if (b < 0x80) return val;
  b = buf[p.pos++]; val |= (b & 0x7f) << 7;  if (b < 0x80) return val;
  b = buf[p.pos++]; val |= (b & 0x7f) << 14; if (b < 0x80) return val;
  b = buf[p.pos++]; val |= (b & 0x7f) << 21; if (b < 0x80) return val;
  b = buf[p.pos];   val |= (b & 0x0f) << 28;

  return readVarintRemainder(val, isSigned, p);
}

function readSvarint(p:BufferPosition) {
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

async function decompress(body:Body) {
	let a = await body.arrayBuffer();
	let d = decompressSync(new Uint8Array(a));
	return d.buffer;
}

interface Body {
	arrayBuffer: () => Promise<ArrayBuffer>;
	body: ReadableStream<Uint8Array> | null;
}

interface BufferPosition {
	buf: Uint8Array;
	pos: number;
}


async function deserializeIndex(body:Body) {
	let a = await decompress(body);

	let p = {buf:new Uint8Array(a),pos:0}
	let entries = readVarint(p,false);

	let idx = new ArrayBuffer(entries*(8+8+4+4))
	let idxview = new DataView(idx);

	// TileId
	var lastId = 0;
	for (var i = 0; i < entries; i++) {
		let v = readVarint(p,false);
		idxview.setBigUint64(24*i,BigInt(lastId+v));
		lastId += v;
	}

	// Offset
	var lastOffset = 0;
	for (var i = 0; i < entries; i++) {
		let v = readSvarint(p);
		idxview.setBigUint64(24*i+8,BigInt(lastOffset+v-1));
		lastOffset += v;
	}

	// Length
	for (var i = 0; i < entries; i++) {
		let v = readVarint(p,false);
		idxview.setUint32(24*i+16,v);
	}

	// RunLength
	for (var i = 0; i < entries; i++) {
		let v = readVarint(p,false);
		idxview.setUint32(24*i+20,v);
	}
	return new DataView(idx);
}

let URL = 'http://localhost:8500/tw.pmtiles'

async function getBytes(offset:number,len:number) {
	let resp = await fetch(URL,{headers:{Range:'bytes=' + offset + '-' + (offset+len-1)}})
	return resp
}

export let doFunc = async () => {
	let resp = await fetch(URL,{headers:{Range:'bytes=0-82'}})
	let a = await resp.arrayBuffer();
	var v = new DataView(a);
	console.log(v.getUint8(2));
	var root_len = v.getUint32(3,true);
	var metadata_len = v.getUint32(7,true);
	let start = 83
	let str = await getBytes(start,root_len)
	let idx = await deserializeIndex(str);

	// binary search over idxview
	// find the entry in the directory with equal or less than

	// lets just get the first one for now...
	let tileid = idx.getBigUint64(0)
	start = Number(idx.getBigUint64(8))
	let len = idx.getUint32(16)
	str = await getBytes(83+root_len+metadata_len+start,len)
	idx = await deserializeIndex(str);
	console.log(idx);
}