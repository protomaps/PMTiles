import { test } from "node:test";
import assert from "node:assert";

import { pmtiles_path, tile_path } from "./index";

test("pmtiles path", () => {
  let result = pmtiles_path("foo", undefined);
  assert.strictEqual(result, "foo.pmtiles");
});

test("pmtiles path", () => {
  let result = pmtiles_path("foo", "folder/{name}/file.pmtiles");
  assert.strictEqual(result, "folder/foo/file.pmtiles");
});

test("pmtiles path with slash", () => {
  let result = pmtiles_path("foo/bar", "folder/{name}/file.pmtiles");
  assert.strictEqual(result, "folder/foo/bar/file.pmtiles");
});

test("pmtiles path with multiple names", () => {
  let result = pmtiles_path("slug", "folder/{name}/{name}.pmtiles");
  assert.strictEqual(result, "folder/slug/slug.pmtiles");
  result = pmtiles_path("foo/bar", "folder/{name}/{name}.pmtiles");
  assert.strictEqual(result, "folder/foo/bar/foo/bar.pmtiles");
});

test("parse tile default", () => {
  let { ok, name, tile, ext } = tile_path("abcd");
  assert.strictEqual(ok, false);

  ({ name, tile } = tile_path("/foo/11/22/33.pbf"));
  assert.strictEqual(name, "foo");
  assert.strictEqual(tile![0], 11);
  assert.strictEqual(tile![1], 22);
  assert.strictEqual(tile![2], 33);
});

test("parse tile path setting", () => {
  let { ok, name, tile, ext } = tile_path(
    "/foo/11/22/33.pbf",
    "/{name}/{z}/{y}/{x}.{ext}"
  );
  assert.strictEqual(tile![1], 33);
  assert.strictEqual(tile![2], 22);
  assert.strictEqual(ext, "pbf");
  ({ ok, name, tile, ext } = tile_path(
    "/tiles/foo/4/2/3.mvt",
    "/tiles/{name}/{z}/{x}/{y}.{ext}"
  ));
  assert.strictEqual(name, "foo");
  assert.strictEqual(tile![0], 4);
  assert.strictEqual(tile![1], 2);
  assert.strictEqual(tile![2], 3);
  assert.strictEqual(ext, "mvt");
});

test("parse tile path setting special chars", () => {
  let { ok, name, tile, ext } = tile_path(
    "/folder(new/foo/11/22/33.pbf",
    "/folder(new/{name}/{z}/{y}/{x}.{ext}"
  );
  assert.strictEqual(name, "foo");
});

test("parse tile path setting slash", () => {
  let { ok, name, tile, ext } = tile_path(
    "/foo/bar/11/22/33.pbf",
    "/{name}/{z}/{y}/{x}.{ext}"
  );
  assert.strictEqual(name, "foo/bar");
});

test("parse tileset default", () => {
  let { ok, name, tile, ext } = tile_path("/abcd.json");
  assert.strictEqual(ok, true);
  assert.strictEqual("abcd", name);
});