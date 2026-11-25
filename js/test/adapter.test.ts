import assert from "node:assert";
import fs from "node:fs";
import { describe, test } from "node:test";
import { PMTiles, Protocol, RangeResponse, Source, TileType } from "../src";
import { mockServer } from "./utils";

// in-memory archive with the header's tile type byte overwritten
class TileTypeSource implements Source {
  buffer: ArrayBuffer;
  key: string;

  constructor(path: string, tileType: TileType) {
    const bytes = new Uint8Array(fs.readFileSync(path));
    bytes[99] = tileType;
    this.buffer = bytes.buffer;
    this.key = `tiletype-${tileType}`;
  }

  getKey() {
    return this.key;
  }

  async getBytes(offset: number, length: number): Promise<RangeResponse> {
    return { data: this.buffer.slice(offset, offset + length) };
  }
}

const getEncoding = async (tileType: TileType, metadata: boolean) => {
  const source = new TileTypeSource(
    "test/data/test_fixture_1.pmtiles",
    tileType
  );
  const protocol = new Protocol({ metadata });
  protocol.add(new PMTiles(source));
  const result = await protocol.tilev4(
    { url: `pmtiles://${source.getKey()}`, type: "json" },
    new AbortController()
  );
  return result.data as { encoding?: string };
};

describe("Protocol", () => {
  test("get TileJSON", async () => {
    mockServer.reset();
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
      encoding: "mvt",
    });
    assert.equal(mockServer.numRequests, 1);
  });

  test("TileJSON of MLT archive has encoding mlt", async () => {
    const pmtiles = new PMTiles("http://localhost:1337/mlt.pmtiles");
    const protocol = new Protocol();
    protocol.add(pmtiles);

    const result = await protocol.tilev4(
      { url: "pmtiles://http://localhost:1337/mlt.pmtiles", type: "json" },
      new AbortController()
    );
    assert.strictEqual((result.data as { encoding?: string }).encoding, "mlt");
  });

  test("TileJSON of MLT archive with metadata has encoding mlt", async () => {
    const pmtiles = new PMTiles("http://localhost:1337/mlt.pmtiles");
    const protocol = new Protocol({ metadata: true });
    protocol.add(pmtiles);

    const result = await protocol.tilev4(
      { url: "pmtiles://http://localhost:1337/mlt.pmtiles", type: "json" },
      new AbortController()
    );
    assert.strictEqual((result.data as { encoding?: string }).encoding, "mlt");
  });

  for (const metadata of [false, true]) {
    test(`TileJSON encoding by tile type (metadata: ${metadata})`, async () => {
      assert.strictEqual(
        (await getEncoding(TileType.Mvt, metadata)).encoding,
        "mvt"
      );
      assert.strictEqual(
        (await getEncoding(TileType.Mlt, metadata)).encoding,
        "mlt"
      );
      const raster = await getEncoding(TileType.Png, metadata);
      assert.ok(!("encoding" in raster));
    });
  }

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

  test("returns empty data for missing MVT tile if errorOnMissingTile is false", async () => {
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

  test("throws error for missing MVT tile if errorOnMissingTile is true", async () => {
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

  test("returns empty data for missing MLT tile if errorOnMissingTile is false", async () => {
    const pmtiles = new PMTiles("http://localhost:1337/mlt.pmtiles");
    const protocol = new Protocol({ errorOnMissingTile: false });
    protocol.add(pmtiles);

    const result = await protocol.tilev4(
      {
        url: "pmtiles://http://localhost:1337/mlt.pmtiles/25/0/0",
        type: "arrayBuffer",
      },
      new AbortController()
    );

    assert.ok(result.data instanceof Uint8Array);
    assert.strictEqual(result.data.length, 0);
  });

  test("throws error for missing MLT tile if errorOnMissingTile is true", async () => {
    const pmtiles = new PMTiles("http://localhost:1337/mlt.pmtiles");
    const protocol = new Protocol({ errorOnMissingTile: true });
    protocol.add(pmtiles);

    const promise = protocol.tilev4(
      {
        url: "pmtiles://http://localhost:1337/mlt.pmtiles/25/0/0",
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
