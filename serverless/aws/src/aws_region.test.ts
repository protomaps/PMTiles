import { test } from "node:test";
import assert from "node:assert";

import { get_region } from "./aws_region";

test("one bucket", () => {
  let result = get_region(
    "us-west-1",
    { bucket: "mybucket", region: "us-west-1" },
    [],
  );
  assert.deepEqual(result, { bucket: "mybucket", region: "us-west-1" });
});

test("unknown region", () => {
  let result = get_region(
    "us-nullisland-1",
    { bucket: "mybucket", region: "us-west-1" },
    [],
  );
  assert.deepEqual(result, { bucket: "mybucket", region: "us-west-1" });
});

test("exact region match", () => {
  let result = get_region(
    "us-west-1",
    { bucket: "mybucket", region: "us-west-1" },
    [{ bucket: "mybucket-ap-south-1", region: "ap-south-1" }],
  );
  assert.deepEqual(result, { bucket: "mybucket", region: "us-west-1" });
  result = get_region(
    "ap-south-1",
    { bucket: "mybucket", region: "us-west-1" },
    [{ bucket: "mybucket-ap-south-1", region: "ap-south-1" }],
  );
  assert.deepEqual(result, {
    bucket: "mybucket-ap-south-1",
    region: "ap-south-1",
  });
});

test("priority match", () => {
  let result = get_region(
    "us-west-1",
    { bucket: "mybucket", region: "ap-south-1" },
    [{ bucket: "mybucket-us-west-2", region: "us-west-2" }],
  );
  assert.deepEqual(result, {
    bucket: "mybucket-us-west-2",
    region: "us-west-2",
  });
});
