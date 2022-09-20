import { test } from "zora";
import {
  unshift,
  getUint24,
  getUint48,
  queryLeafdir,
  queryLeafLevel,
  queryTile,
  parseEntry,
  Entry,
  createDirectory,
} from "./index";

import { Entry as EntryV3, zxyToTileId, tileIdToZxy, findTile } from "./v3";

test("stub data", (assertion) => {
  let dataview = createDirectory([
    { z: 5, x: 1000, y: 2000, offset: 1000, length: 2000, is_dir: false },
    {
      z: 14,
      x: 16383,
      y: 16383,
      offset: 999999,
      length: 999,
      is_dir: false,
    },
  ]);

  var z_raw = dataview.getUint8(17 + 0);
  var x = getUint24(dataview, 17 + 1);
  var y = getUint24(dataview, 17 + 4);
  var offset = getUint48(dataview, 17 + 7);
  var length = dataview.getUint32(17 + 13, true);
  assertion.ok(z_raw === 14);
  assertion.ok(x === 16383);
  assertion.ok(y === 16383);
});

test("get entry", (assertion) => {
  let view = createDirectory([
    { z: 5, x: 1000, y: 2000, offset: 1000, length: 2000, is_dir: false },
    {
      z: 14,
      x: 16383,
      y: 16383,
      offset: 999999,
      length: 999,
      is_dir: false,
    },
  ]);
  let entry = queryTile(view, 14, 16383, 16383);
  assertion.ok(entry!.z === 14);
  assertion.ok(entry!.x === 16383);
  assertion.ok(entry!.y === 16383);
  assertion.ok(entry!.offset === 999999);
  assertion.ok(entry!.length === 999);
  assertion.ok(entry!.is_dir === false);
  assertion.ok(queryLeafdir(view, 14, 16383, 16383) === null);
});

test("get leafdir", (assertion) => {
  let view = createDirectory([
    {
      z: 14,
      x: 16383,
      y: 16383,
      offset: 999999,
      length: 999,
      is_dir: true,
    },
  ]);
  let entry = queryLeafdir(view, 14, 16383, 16383);
  assertion.ok(entry!.z === 14);
  assertion.ok(entry!.x === 16383);
  assertion.ok(entry!.y === 16383);
  assertion.ok(entry!.offset === 999999);
  assertion.ok(entry!.length === 999);
  assertion.ok(entry!.is_dir === true);
  assertion.ok(queryTile(view, 14, 16383, 16383) === null);
});

test("derive the leaf level", (assertion) => {
  let view = createDirectory([
    {
      z: 6,
      x: 3,
      y: 3,
      offset: 0,
      length: 0,
      is_dir: true,
    },
  ]);
  let level = queryLeafLevel(view);
  assertion.ok(level === 6);
  view = createDirectory([
    {
      z: 6,
      x: 3,
      y: 3,
      offset: 0,
      length: 0,
      is_dir: false,
    },
  ]);
  level = queryLeafLevel(view);
  assertion.ok(level === null);
});

test("convert spec v1 directory to spec v2 directory", (assertion) => {
  let view = createDirectory([
    {
      z: 7,
      x: 3,
      y: 3,
      offset: 3,
      length: 3,
      is_dir: true,
    },
    {
      z: 6,
      x: 2,
      y: 2,
      offset: 2,
      length: 2,
      is_dir: false,
    },
    {
      z: 6,
      x: 2,
      y: 1,
      offset: 1,
      length: 1,
      is_dir: false,
    },
  ]);
  let entry = queryLeafdir(view, 7, 3, 3);
  assertion.ok(entry!.offset === 3);
  entry = queryTile(view, 6, 2, 2);
  assertion.ok(entry!.offset === 2);
  entry = queryTile(view, 6, 2, 1);
  assertion.ok(entry!.offset === 1);

  entry = parseEntry(view, 0);
  assertion.ok(entry!.offset === 1);
  entry = parseEntry(view, 1);
  assertion.ok(entry!.offset === 2);
  entry = parseEntry(view, 2);
  assertion.ok(entry!.offset === 3);
});

test("zxy to tile id", (assertion) => {
  assertion.eq(zxyToTileId(0, 0, 0), 0);
  assertion.eq(zxyToTileId(1, 0, 0), 1);
  assertion.eq(zxyToTileId(1, 0, 1), 2);
  assertion.eq(zxyToTileId(1, 1, 1), 3);
  assertion.eq(zxyToTileId(1, 1, 0), 4);
  assertion.eq(zxyToTileId(2, 0, 0), 5);
});

test("tile id to zxy", (assertion) => {
  assertion.eq(tileIdToZxy(0), [0, 0, 0]);
  assertion.eq(tileIdToZxy(1), [1, 0, 0]);
  assertion.eq(tileIdToZxy(2), [1, 0, 1]);
  assertion.eq(tileIdToZxy(3), [1, 1, 1]);
  assertion.eq(tileIdToZxy(4), [1, 1, 0]);
  assertion.eq(tileIdToZxy(5), [2, 0, 0]);
});

test("a lot of tiles", (assertion) => {
  for (var z = 0; z < 9; z++) {
    for (var x = 0; x < 1 << z; x++) {
      for (var y = 0; y < 1 << z; y++) {
        let result = tileIdToZxy(zxyToTileId(z, x, y));
        if (result[0] !== z || result[1] !== x || result[2] !== y) {
          assertion.fail("roundtrip failed");
        }
      }
    }
  }
});

test("tile search for first entry == id", (assertion) => {
  let entries: EntryV3[] = [];
  assertion.eq(findTile(entries, 101), null);
});

test("tile search for first entry == id", (assertion) => {
  let entries: EntryV3[] = [{ tileId: 100, offset: 1, length: 1, runLength: 1 }];
  let entry = findTile(entries, 100)!;
  assertion.eq(entry.offset, 1);
  assertion.eq(entry.length, 1);
  assertion.eq(findTile(entries, 101), null);
});

test("tile search for first entry == id", (assertion) => {
  let entries: EntryV3[] = [{ tileId: 100, offset: 1, length: 1, runLength: 2 }];
  let entry = findTile(entries, 101)!;
  assertion.eq(entry.offset, 1);
  assertion.eq(entry.length, 1);

  entries = [
    { tileId: 100, offset: 1, length: 1, runLength: 1 },
    { tileId: 150, offset: 2, length: 2, runLength: 2 },
  ];
  entry = findTile(entries, 151)!;
  assertion.eq(entry.offset, 2);
  assertion.eq(entry.length, 2);

  entries = [
    { tileId: 50, offset: 1, length: 1, runLength: 2 },
    { tileId: 100, offset: 2, length: 2, runLength: 1 },
    { tileId: 150, offset: 3, length: 3, runLength: 1 },
  ];
  entry = findTile(entries, 51)!;
  assertion.eq(entry.offset, 1);
  assertion.eq(entry.length, 1);
});

test("leaf search", (assertion) => {
  let entries: EntryV3[] = [{ tileId: 100, offset: 1, length: 1, runLength: 0 }];
  let entry = findTile(entries, 150);
  assertion.eq(entry!.offset, 1);
  assertion.eq(entry!.length, 1);
});
