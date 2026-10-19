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

const INVALID = { ok: false, name: "", tile: [0, 0, 0], ext: "" };

test("tile path", () => {
  assert.deepStrictEqual(tile_path("/foo/1/2/3.mvt"), {
    ok: true,
    name: "foo",
    tile: [1, 2, 3],
    ext: "mvt",
  });
});

test("tile path with nested ASCII name", () => {
  assert.deepStrictEqual(tile_path("/a/b-c_d.e/0/0/0.png"), {
    ok: true,
    name: "a/b-c_d.e",
    tile: [0, 0, 0],
    ext: "png",
  });
});

test("tileset path", () => {
  assert.deepStrictEqual(tile_path("/foo.json"), {
    ok: true,
    name: "foo",
    ext: "json",
  });
});

test("tile path with percent-encoded unicode name", () => {
  const encoded = encodeURIComponent("我的城市");
  assert.deepStrictEqual(tile_path(`/${encoded}/0/0/0.mvt`), {
    ok: true,
    name: "我的城市",
    tile: [0, 0, 0],
    ext: "mvt",
  });
});

test("tile path with raw unicode name", () => {
  assert.deepStrictEqual(tile_path("/我的城市/0/0/0.mvt"), {
    ok: true,
    name: "我的城市",
    tile: [0, 0, 0],
    ext: "mvt",
  });
});

test("tileset path with unicode name", () => {
  assert.deepStrictEqual(tile_path("/我的城市.json"), {
    ok: true,
    name: "我的城市",
    ext: "json",
  });
  assert.deepStrictEqual(
    tile_path(`/${encodeURIComponent("我的城市")}.json`),
    { ok: true, name: "我的城市", ext: "json" }
  );
});

test("tile path with nested unicode name", () => {
  assert.deepStrictEqual(tile_path("/a/我的城市/1/2/3.mvt"), {
    ok: true,
    name: "a/我的城市",
    tile: [1, 2, 3],
    ext: "mvt",
  });
});

test("tile path decodes only once", () => {
  assert.strictEqual(tile_path("/100%2525/0/0/0.mvt").name, "100%25");
});

test("tile path rejects parent directory segments", () => {
  for (const path of [
    "/../x/0/0/0.mvt",
    "/a/../b/0/0/0.mvt",
    "/a/../b.json",
    "/../x.json",
    "/a/..",
    "/%2e%2e/x/0/0/0.mvt",
    "/%2E%2E/x/0/0/0.mvt",
    "/a/%2e%2e/b.json",
    "/a%2f..%2fb.json",
    "/a%2F%2e%2e%2Fb/0/0/0.mvt",
    "/a/%2e%2e%5cb.json",
  ]) {
    assert.deepStrictEqual(tile_path(path), INVALID, path);
  }
});

test("tile path rejects null bytes, control characters and backslashes", () => {
  for (const path of [
    "/a%00b/0/0/0.mvt",
    "/a%00b.json",
    "/a\0b.json",
    "/a%0Ab.json",
    "/a\nb.json",
    "/a%7Fb.json",
    "/a%5Cb/0/0/0.mvt",
    "/a%5cb.json",
    "/a\\b.json",
  ]) {
    assert.deepStrictEqual(tile_path(path), INVALID, path);
  }
});

test("tile path rejects empty names", () => {
  for (const path of ["/", "/.json", "//0/0/0.mvt", "/0/0/0.mvt", ""]) {
    assert.deepStrictEqual(tile_path(path), INVALID, path);
  }
});

test("tile path rejects malformed percent-encoding", () => {
  for (const path of [
    "/%E6%88/0/0/0.mvt",
    "/%/0/0/0.mvt",
    "/a%zz.json",
    "/%C0%AF.json",
  ]) {
    assert.deepStrictEqual(tile_path(path), INVALID, path);
  }
});

