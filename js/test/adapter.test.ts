import assert from "node:assert";
import { afterEach, beforeEach, describe, it, test } from "node:test";
import { MockServer } from "./utils";
import { PMTiles, Protocol } from "../src";

const mockserver = new MockServer();

describe("Protocol", () => {
  test("get TileJSON", async () => {
    const pmtiles = new PMTiles("http://localhost:1337/example.pmtiles");
    const protocol = new Protocol();
    protocol.add(pmtiles);

    const result = await protocol.tilev4(
      {
        url: "pmtiles://http://localhost:1337/example.pmtiles",
        type: "json",
      },
      new AbortController()
    );

    assert.deepStrictEqual(result.data, {
      tiles: ["pmtiles://http://localhost:1337/example.pmtiles/{z}/{x}/{y}"],
      minzoom: 0,
      maxzoom: 0,
      bounds: [0, 0, 0.9999999, 1],
    });
  });

  test("get tile data", async () => {
    const pmtiles = new PMTiles("http://localhost:1337/example.pmtiles");
    const protocol = new Protocol();
    protocol.add(pmtiles);

    const result = await protocol.tilev4(
      {
        url: "pmtiles://http://localhost:1337/example.pmtiles/0/0/0",
        type: "arrayBuffer",
      },
      new AbortController()
    );

    assert.ok(result.data instanceof Uint8Array);
    assert.strictEqual(result.data.length, 49);
  });

  test("returns empty data for missing tile if errorOnMissingTile is false", async () => {
    const pmtiles = new PMTiles("http://localhost:1337/example.pmtiles");
    const protocol = new Protocol({ errorOnMissingTile: false });
    protocol.add(pmtiles);

    const result = await protocol.tilev4(
      {
        url: "pmtiles://http://localhost:1337/example.pmtiles/25/0/0",
        type: "arrayBuffer",
      },
      new AbortController()
    );

    assert.ok(result.data instanceof Uint8Array);
    assert.strictEqual(result.data.length, 0);
  });

  test("throws error for missing tile if errorOnMissingTile is true", async () => {
    const pmtiles = new PMTiles("http://localhost:1337/example.pmtiles");
    const protocol = new Protocol({ errorOnMissingTile: true });
    protocol.add(pmtiles);

    const promise = protocol.tilev4(
      {
        url: "pmtiles://http://localhost:1337/example.pmtiles/25/0/0",
        type: "arrayBuffer",
      },
      new AbortController()
    );

    assert.rejects(promise, { message: "Tile not found." });
  });

  test("throws AbortError when AbortController is signaled while accessing TileJSON", async () => {
    const pmtiles = new PMTiles("http://localhost:1337/example.pmtiles");
    const protocol = new Protocol();
    protocol.add(pmtiles);

    const abortController = new AbortController();

    const resultPromise = protocol.tilev4(
      {
        url: "pmtiles://http://localhost:1337/example.pmtiles",
        type: "json",
      },
      abortController
    );

    abortController.abort();

    await assert.rejects(resultPromise, { name: "AbortError" });
  });

  test("throws AbortError when AbortController is signaled while accessing tile data", async () => {
    const pmtiles = new PMTiles("http://localhost:1337/example.pmtiles");
    const protocol = new Protocol();
    protocol.add(pmtiles);

    const abortController = new AbortController();

    const resultPromise = protocol.tilev4(
      {
        url: "pmtiles://http://localhost:1337/example.pmtiles/0/0/0",
        type: "arrayBuffer",
      },
      abortController
    );

    abortController.abort();

    await assert.rejects(resultPromise, { name: "AbortError" });
  });
});
