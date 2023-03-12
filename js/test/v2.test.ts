import { test } from "node:test";
import assert from "node:assert";

import {
  unshift,
  getUint24,
  getUint48,
  deriveLeaf,
  queryLeafdir,
  queryTile,
  parseEntry,
  EntryV2,
  createDirectory,
} from "../v2";

test("stub data", () => {
  let dataview = new DataView(
    createDirectory([
      { z: 5, x: 1000, y: 2000, offset: 1000, length: 2000, is_dir: false },
      {
        z: 14,
        x: 16383,
        y: 16383,
        offset: 999999,
        length: 999,
        is_dir: false,
      },
    ])
  );
  var z_raw = dataview.getUint8(17 + 0);
  var x = getUint24(dataview, 17 + 1);
  var y = getUint24(dataview, 17 + 4);
  var offset = getUint48(dataview, 17 + 7);
  var length = dataview.getUint32(17 + 13, true);
  assert.strictEqual(z_raw, 14);
  assert.strictEqual(x, 16383);
  assert.strictEqual(y, 16383);
});

test("get entry", () => {
  let view = new DataView(
    createDirectory([
      { z: 5, x: 1000, y: 2000, offset: 1000, length: 2000, is_dir: false },
      {
        z: 14,
        x: 16383,
        y: 16383,
        offset: 999999,
        length: 999,
        is_dir: false,
      },
    ])
  );
  let entry = queryTile(view, 14, 16383, 16383);
  assert.strictEqual(entry!.z, 14);
  assert.strictEqual(entry!.x, 16383);
  assert.strictEqual(entry!.y, 16383);
  assert.strictEqual(entry!.offset, 999999);
  assert.strictEqual(entry!.length, 999);
  assert.strictEqual(entry!.is_dir, false);
  assert.strictEqual(queryLeafdir(view, 14, 16383, 16383), null);
});

test("get leafdir", () => {
  let view = new DataView(
    createDirectory([
      {
        z: 14,
        x: 16383,
        y: 16383,
        offset: 999999,
        length: 999,
        is_dir: true,
      },
    ])
  );
  let entry = queryLeafdir(view, 14, 16383, 16383);
  assert.strictEqual(entry!.z, 14);
  assert.strictEqual(entry!.x, 16383);
  assert.strictEqual(entry!.y, 16383);
  assert.strictEqual(entry!.offset, 999999);
  assert.strictEqual(entry!.length, 999);
  assert.strictEqual(entry!.is_dir, true);
  assert.strictEqual(queryTile(view, 14, 16383, 16383), null);
});

test("derive the leaf level", () => {
  let view = new DataView(
    createDirectory([
      {
        z: 6,
        x: 3,
        y: 3,
        offset: 0,
        length: 0,
        is_dir: true,
      },
    ])
  );
  let leaf = deriveLeaf(view, { z: 7, x: 6, y: 6 });
  assert.strictEqual(leaf!.z, 6);
  assert.strictEqual(leaf!.x, 3);
  assert.strictEqual(leaf!.y, 3);
  view = new DataView(
    createDirectory([
      {
        z: 6,
        x: 3,
        y: 3,
        offset: 0,
        length: 0,
        is_dir: false,
      },
    ])
  );
  leaf = deriveLeaf(view, { z: 7, x: 6, y: 6 });
  assert.strictEqual(leaf, null);
});

test("convert spec v1 directory to spec v2 directory", () => {
  let view = new DataView(
    createDirectory([
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
    ])
  );
  let entry = queryLeafdir(view, 7, 3, 3);
  assert.strictEqual(entry!.offset, 3);
  entry = queryTile(view, 6, 2, 2);
  assert.strictEqual(entry!.offset, 2);
  entry = queryTile(view, 6, 2, 1);
  assert.strictEqual(entry!.offset, 1);

  entry = parseEntry(view, 0);
  assert.strictEqual(entry!.offset, 1);
  entry = parseEntry(view, 1);
  assert.strictEqual(entry!.offset, 2);
  entry = parseEntry(view, 2);
  assert.strictEqual(entry!.offset, 3);
});
