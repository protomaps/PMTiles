import { test } from "zora";
import { unshift, getUint24, getUint48, getLeafdir, getTile } from "./pmtiles";

interface StubEntry {
	z:number;
	x:number;
	y:number;
	offset:number;
	length:number;
	is_dir:boolean;
}

const stubData = (entries:StubEntry[]) => {
	// sort entries
	let buffer = new ArrayBuffer(17*entries.length);
	let arr = new Uint8Array(buffer);
	for (var i = 0; i < entries.length; i++) {
		var entry = entries[i];
		var z = entry.z;
		if (entry.is_dir) z = z | 0x80;
		arr[i*17] = z;

		arr[i*17+1] = entry.x & 0xFF;
		arr[i*17+2] = (entry.x >> 8) & 0xFF;
		arr[i*17+3] = (entry.x >> 16) & 0xFF;
		``
		arr[i*17+4] = entry.y & 0xFF;
		arr[i*17+5] = (entry.y >> 8) & 0xFF;
		arr[i*17+6] = (entry.y >> 16) & 0xFF;

		arr[i*17+7] = entry.offset & 0xFF;
		arr[i*17+8] = unshift(entry.offset,8) & 0xFF;
		arr[i*17+9] = unshift(entry.offset,16) & 0xFF;
		arr[i*17+10] = unshift(entry.offset,24) & 0xFF;
		arr[i*17+11] = unshift(entry.offset,32) & 0xFF;
		arr[i*17+12] = unshift(entry.offset,48) & 0xFF;

		arr[i*17+13] = entry.length & 0xFF;
		arr[i*17+14] = (entry.length >> 8) & 0xFF;
		arr[i*17+15] = (entry.length >> 16) & 0xFF;
		arr[i*17+16] = (entry.length >> 24) & 0xFF;
	}
	return buffer;
}

test("stub data", assertion => {
	let data = stubData([
		{z:5,x:1000,y:2000,offset:1000,length:2000,is_dir:false},
		{z:14,x:16383,y:16383,offset:999999,length:999,is_dir:false}
	]);
	let dataview = new DataView(data);	

	var z_raw = dataview.getUint8(17+0);
	var x = getUint24(dataview,17+1);
	var y = getUint24(dataview,17+4);
	var offset = getUint48(dataview,17+7);
	var length = dataview.getUint32(17+13,true);
 	assertion.ok(z_raw === 14);
 	assertion.ok(x === 16383);
 	assertion.ok(y === 16383);
});

test("get entry", assertion => {
	let data = stubData([
		{z:5,x:1000,y:2000,offset:1000,length:2000,is_dir:false},
		{z:14,x:16383,y:16383,offset:999999,length:999,is_dir:false}
	]);
	let view = new DataView(data);
	let entry = getTile(view,14,16383,16383);
	assertion.ok(entry!.offset === 999999);
	assertion.ok(entry!.length = 999);
})

test("get leafdir", assertion => {
	let data = stubData([
		{z:14,x:16383,y:16383,offset:999999,length:999,is_dir:true}
	]);
	let view = new DataView(data);
	let entry = getLeafdir(view,14,16383,16383);
	assertion.ok(entry!.offset === 999999);
	assertion.ok(entry!.length = 999);
	assertion.ok(getTile(view,14,16383,16383) === null);
})
