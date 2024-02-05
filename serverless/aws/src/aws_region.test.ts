import assert from "node:assert";
import { test } from "node:test";

import { getRegion } from "./aws_region";

test("one bucket", () => {
  const result = getRegion(
    "us-west-1",
    { bucket: "mybucket", region: "us-west-1" },
    []
  );
  assert.deepEqual(result, { bucket: "mybucket", region: "us-west-1" });
});

test("unknown region", () => {
  const result = getRegion(
    "us-nullisland-1",
    { bucket: "mybucket", region: "us-west-1" },
    []
  );
  assert.deepEqual(result, { bucket: "mybucket", region: "us-west-1" });
});

test("exact region match", () => {
  let result = getRegion(
    "us-west-1",
    { bucket: "mybucket", region: "us-west-1" },
    [{ bucket: "mybucket-ap-south-1", region: "ap-south-1" }]
  );
  assert.deepEqual(result, { bucket: "mybucket", region: "us-west-1" });
  result = getRegion(
    "ap-south-1",
    { bucket: "mybucket", region: "us-west-1" },
    [{ bucket: "mybucket-ap-south-1", region: "ap-south-1" }]
  );
  assert.deepEqual(result, {
    bucket: "mybucket-ap-south-1",
    region: "ap-south-1",
  });
});

test("priority match", () => {
  const result = getRegion(
    "us-west-1",
    { bucket: "mybucket", region: "ap-south-1" },
    [{ bucket: "mybucket-us-west-2", region: "us-west-2" }]
  );
  assert.deepEqual(result, {
    bucket: "mybucket-us-west-2",
    region: "us-west-2",
  });
});
