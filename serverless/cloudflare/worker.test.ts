import { test } from "zora";
import { pmtiles_path } from "./worker";

test("pmtiles path", (assertion) => {
  let result = pmtiles_path(undefined, "foo");
  assertion.equal(result, "foo.pmtiles");
});

test("pmtiles path", (assertion) => {
  let result = pmtiles_path("folder/{name}/file.pmtiles", "foo");
  assertion.equal(result, "folder/foo/file.pmtiles");
});

test("pmtiles path with slash", (assertion) => {
  let result = pmtiles_path("folder/{name}/file.pmtiles", "foo/bar");
  assertion.equal(result, "folder/foo/bar/file.pmtiles");
});
