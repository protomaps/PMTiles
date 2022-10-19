import { test } from "zora";
import { pmtiles_path, tile_path } from "./index";

test("pmtiles path", (assertion) => {
  let result = pmtiles_path("foo", undefined);
  assertion.equal(result, "foo.pmtiles");
});

test("pmtiles path", (assertion) => {
  let result = pmtiles_path("foo","folder/{name}/file.pmtiles");
  assertion.equal(result, "folder/foo/file.pmtiles");
});

test("pmtiles path with slash", (assertion) => {
  let result = pmtiles_path("foo/bar","folder/{name}/file.pmtiles");
  assertion.equal(result, "folder/foo/bar/file.pmtiles");
});

test("parse tile default", (assertion) => {
  let {ok, name, tile, ext} = tile_path("abcd");
  assertion.equal(ok, false);

  ({name, tile} = tile_path("/foo/11/22/33.pbf"));
  assertion.equal(name,"foo");
  assertion.equal(tile[0],11);
  assertion.equal(tile[1],22);
  assertion.equal(tile[2],33);
});

test("parse tile path setting", (assertion) => {
  let {ok, name, tile, ext} = tile_path("/foo/11/22/33.pbf","/{name}/{z}/{y}/{x}.{ext}");
  assertion.equal(tile[1],33);
  assertion.equal(tile[2],22);
  assertion.equal(ext,"pbf");
  ({ok, name, tile, ext} = tile_path("/tiles/foo/4/2/3.mvt","/tiles/{name}/{z}/{x}/{y}.{ext}"));
  assertion.equal(name,"foo");
  assertion.equal(tile[0],4);
  assertion.equal(tile[1],2);
  assertion.equal(tile[2],3);
  assertion.equal(ext,"mvt");
});

test("parse tile path setting special chars", (assertion) => {
  let {ok, name, tile, ext} = tile_path("/folder(new/foo/11/22/33.pbf","/folder(new/{name}/{z}/{y}/{x}.{ext}");
  assertion.equal(name,"foo");
});

test("parse tile path setting slash", (assertion) => {
  let {ok, name, tile, ext} = tile_path("/foo/bar/11/22/33.pbf","/{name}/{z}/{y}/{x}.{ext}");
  assertion.equal(name,"foo/bar");
});
