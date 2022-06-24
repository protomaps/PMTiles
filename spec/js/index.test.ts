import { test } from "zora";
import { Entry, zxyToTileId, tileIdToZxy, findTile } from "./index"

test("zxy to tile id", (assertion) => {
	assertion.eq(zxyToTileId(0,0,0),0);
	assertion.eq(zxyToTileId(1,0,0),1);
	assertion.eq(zxyToTileId(1,0,1),2);
	assertion.eq(zxyToTileId(1,1,1),3);
	assertion.eq(zxyToTileId(1,1,0),4);
	assertion.eq(zxyToTileId(2,0,0),5);
});

test("tile id to zxy", (assertion) => {
	assertion.eq(tileIdToZxy(0),[0,0,0]);
	assertion.eq(tileIdToZxy(1),[1,0,0]);
	assertion.eq(tileIdToZxy(2),[1,0,1]);
	assertion.eq(tileIdToZxy(3),[1,1,1]);
	assertion.eq(tileIdToZxy(4),[1,1,0]);
	assertion.eq(tileIdToZxy(5),[2,0,0]);
});

test("a lot of tiles", (assertion) => {
	for (var z = 0; z < 9; z++) {
		for (var x = 0; x < (1 << z); x++) {
			for (var y = 0; y < (1 << z); y++) {
				assertion.eq([z,x,y],tileIdToZxy(zxyToTileId(z,x,y)))
			}
		}
	}
});

test("tile search for first entry == id", (assertion) => {
	let entries:Entry[] = [
	];
	assertion.eq(findTile(entries,101),null);
})

test("tile search for first entry == id", (assertion) => {
	let entries:Entry[] = [
		{tileId:100,offset:1,length:1,runLength:1}
	];
	let entry = findTile(entries,100)!;
	assertion.eq(entry.offset,1);
	assertion.eq(entry.length,1);
	assertion.eq(findTile(entries,101),null);
})

test("tile search for first entry == id", (assertion) => {
	let entries:Entry[] = [
		{tileId:100,offset:1,length:1,runLength:2}
	];
	let entry = findTile(entries,101)!;
	assertion.eq(entry.offset,1);
	assertion.eq(entry.length,1);

	entries = [
		{tileId:100,offset:1,length:1,runLength:1},
		{tileId:150,offset:2,length:2,runLength:2}
	];
	entry = findTile(entries,151)!;
	assertion.eq(entry.offset,2);
	assertion.eq(entry.length,2);

	entries = [
		{tileId:50,offset:1,length:1,runLength:2},
		{tileId:100,offset:2,length:2,runLength:1},
		{tileId:150,offset:3,length:3,runLength:1}
	];
	entry = findTile(entries,51)!;
	assertion.eq(entry.offset,1);
	assertion.eq(entry.length,1);
})

test("leaf search", (assertion) => {
	let entries:Entry[] = [
		{tileId:100,offset:1,length:1,runLength:0}
	];
	let entry = findTile(entries,150);
	assertion.eq(entry!.offset,1);
	assertion.eq(entry!.length,1);
})