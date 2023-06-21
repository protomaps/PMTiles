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

