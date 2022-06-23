import { test } from "zora";
import { zxyToTileId, tileIdToZxy } from "./index"

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

test("binary search for first entry <= id", (assertion) => {
	
})