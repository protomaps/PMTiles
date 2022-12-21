import { test } from "node:test";
import assert from "node:assert";

import { vtfilter, parseAttributes } from "./vtfilter";

import fs from "fs";
import { VectorTile } from "@mapbox/vector-tile";
import Protobuf from "pbf";

test("basic attribute filter globals", () => {
  let result = parseAttributes("attr1");
  assert(result.names.has("attr1"));
  assert.strictEqual(result.names.size, 1);

  result = parseAttributes("attr1,attr2");
  assert(result.names.has("attr1"));
  assert(result.names.has("attr2"));
  assert.strictEqual(result.names.size, 2);

  result = parseAttributes("attr\\:withcolon");
  assert(result.names.has("attr:withcolon"));
  assert.strictEqual(result.names.size, 1);

  result = parseAttributes("attr\\,withcomma");
  assert(result.names.has("attr,withcomma"));
  assert.strictEqual(result.names.size, 1);
});

test("basic attribute filter by layer", () => {
  let result = parseAttributes("layer1:attr1");
  assert.strictEqual(result.names.size, 0);
  assert.strictEqual(result.byLayer.get("layer1")!.size, 1);
  assert(result.byLayer.get("layer1")!.has("attr1"));

  result = parseAttributes("attr1,layer1:attr2,layer1:attr3,layer2:attr4");
  assert.strictEqual(result.names.size, 1);
  assert(result.names.has("attr1"));
  assert.strictEqual(result.byLayer.get("layer1")!.size, 2);
  assert(result.byLayer.get("layer1")!.has("attr2"));
  assert(result.byLayer.get("layer1")!.has("attr3"));
  assert.strictEqual(result.byLayer.get("layer2")!.size, 1);
  assert(result.byLayer.get("layer2")!.has("attr4"));

  result = parseAttributes(
    "layer\\,withcomma\\:withcolon:attr\\,withcomma\\:withcolon"
  );
  assert.strictEqual(result.byLayer.get("layer,withcomma:withcolon")!.size, 1);
  assert(
    result.byLayer
      .get("layer,withcomma:withcolon")!
      .has("attr,withcomma:withcolon")
  );
});

test("malformed input", () => {
  let result = parseAttributes(",");
  assert.strictEqual(result.names.size, 0);
  result = parseAttributes(":");
  assert.strictEqual(result.names.size, 0);
  result = parseAttributes("attr:too:manycolons");
  assert.strictEqual(result.names.size, 0);
  assert.strictEqual(result.byLayer.get("attr")!.size, 1);
  assert(result.byLayer.get("attr")!.has("too"));
});

test("1:1", () => {
  const data = fs.readFileSync("fixtures/sample.pbf");
  let result = vtfilter(data, undefined);
  assert(result === data);
  result = vtfilter(data, "*");
  assert(result === data);

  let orig = new VectorTile(new Protobuf(data));
  result = vtfilter(data, "*,extra_key_to_make_shaving_run");
  let out = new VectorTile(new Protobuf(result));

  let orig_values = [];
  let out_values = [];
  for (let layername in orig.layers) {
    assert.strictEqual(
      out.layers[layername].length,
      orig.layers[layername].length
    );
    for (var i = 0; i < orig.layers[layername].length; i++) {
      let orig_feature = orig.layers[layername].feature(i);
      let out_feature = out.layers[layername].feature(i);
      orig_values.push(orig_feature.properties);
      orig_values.push(orig_feature.loadGeometry());
      out_values.push(out_feature.properties);
      out_values.push(out_feature.loadGeometry());
    }
  }
  assert.deepEqual(orig_values, out_values);
});

test("filter specific layer", () => {
  const data = fs.readFileSync("fixtures/sample.pbf");

  const result = vtfilter(data, "water:natural,landuse:*");
  let out = new VectorTile(new Protobuf(result));
  assert.strictEqual(Object.keys(out.layers).length, 8);

  for (var i = 0; i < out.layers["water"].length; i++) {
    let feature = out.layers["water"].feature(i);
    assert(Object.keys(feature.properties).length < 2);
  }
});
