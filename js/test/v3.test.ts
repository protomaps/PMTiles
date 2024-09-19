import fs from "fs";
import assert from "node:assert";
import { afterEach, beforeEach, describe, it, test } from "node:test";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import {
  BufferPosition,
  Entry,
  PMTiles,
  RangeResponse,
  SharedPromiseCache,
  Source,
  TileType,
  findTile,
  getUint64,
  readVarint,
  tileIdToZxy,
  tileTypeExt,
  zxyToTileId,
} from "../index";

class MockServer {
  etag?: string;
  numRequests: number;
  lastCache?: string;

  reset() {
    this.numRequests = 0;
    this.etag = undefined;
  }

  constructor() {
    this.numRequests = 0;
    this.etag = undefined;
    const serverBuffer = fs.readFileSync("test/data/test_fixture_1.pmtiles");
    const server = setupServer(
      http.get(
        "http://localhost:1337/example.pmtiles",
        ({ request, params }) => {
          this.lastCache = request.cache;
          this.numRequests++;
          const range = request.headers.get("range")?.substr(6).split("-");
          if (!range) {
            throw Error("invalid range");
          }
          const offset = +range[0];
          const length = +range[1];
          const body = serverBuffer.slice(offset, offset + length - 1);
          return new HttpResponse(body, {
            status: 206,
            statusText: "OK",
            headers: { etag: this.etag } as HeadersInit,
          });
        }
      )
    );
    server.listen({ onUnhandledRequest: "error" });
  }
}

const mockserver = new MockServer();

test("varint", () => {
  let b: BufferPosition = {
    buf: new Uint8Array([0, 1, 127, 0xe5, 0x8e, 0x26]),
    pos: 0,
  };
  assert.strictEqual(readVarint(b), 0);
  assert.strictEqual(readVarint(b), 1);
  assert.strictEqual(readVarint(b), 127);
  assert.strictEqual(readVarint(b), 624485);
  b = {
    buf: new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x0f]),
    pos: 0,
  };
  assert.strictEqual(readVarint(b), 9007199254740991);
});

test("zxy to tile id", () => {
  assert.strictEqual(zxyToTileId(0, 0, 0), 0);
  assert.strictEqual(zxyToTileId(1, 0, 0), 1);
  assert.strictEqual(zxyToTileId(1, 0, 1), 2);
  assert.strictEqual(zxyToTileId(1, 1, 1), 3);
  assert.strictEqual(zxyToTileId(1, 1, 0), 4);
  assert.strictEqual(zxyToTileId(2, 0, 0), 5);
});

test("tile id to zxy", () => {
  assert.deepEqual(tileIdToZxy(0), [0, 0, 0]);
  assert.deepEqual(tileIdToZxy(1), [1, 0, 0]);
  assert.deepEqual(tileIdToZxy(2), [1, 0, 1]);
  assert.deepEqual(tileIdToZxy(3), [1, 1, 1]);
  assert.deepEqual(tileIdToZxy(4), [1, 1, 0]);
  assert.deepEqual(tileIdToZxy(5), [2, 0, 0]);
});

test("a lot of tiles", () => {
  for (let z = 0; z < 9; z++) {
    for (let x = 0; x < 1 << z; x++) {
      for (let y = 0; y < 1 << z; y++) {
        const result = tileIdToZxy(zxyToTileId(z, x, y));
        if (result[0] !== z || result[1] !== x || result[2] !== y) {
          assert.fail("roundtrip failed");
        }
      }
    }
  }
});

test("tile extremes", () => {
  for (let z = 0; z < 27; z++) {
    const dim = 2 ** z - 1;
    const tl = tileIdToZxy(zxyToTileId(z, 0, 0));
    assert.deepEqual([z, 0, 0], tl);
    const tr = tileIdToZxy(zxyToTileId(z, dim, 0));
    assert.deepEqual([z, dim, 0], tr);
    const bl = tileIdToZxy(zxyToTileId(z, 0, dim));
    assert.deepEqual([z, 0, dim], bl);
    const br = tileIdToZxy(zxyToTileId(z, dim, dim));
    assert.deepEqual([z, dim, dim], br);
  }
});

test("invalid tiles", () => {
  assert.throws(() => {
    tileIdToZxy(Number.MAX_SAFE_INTEGER);
  });

  assert.throws(() => {
    zxyToTileId(27, 0, 0);
  });

  assert.throws(() => {
    zxyToTileId(0, 1, 1);
  });
});

test("tile search for missing entry", () => {
  const entries: Entry[] = [];
  assert.strictEqual(findTile(entries, 101), null);
});

test("tile search for first entry == id", () => {
  const entries: Entry[] = [
    { tileId: 100, offset: 1, length: 1, runLength: 1 },
  ];
  const entry = findTile(entries, 100);
  assert.strictEqual(entry?.offset, 1);
  assert.strictEqual(entry?.length, 1);
  assert.strictEqual(findTile(entries, 101), null);
});

test("tile search with runlength", () => {
  const entries: Entry[] = [
    { tileId: 3, offset: 3, length: 1, runLength: 2 },
    { tileId: 5, offset: 5, length: 1, runLength: 2 },
  ];
  const entry = findTile(entries, 4);
  assert.strictEqual(entry?.offset, 3);
});

test("tile search with multiple tile entries", () => {
  let entries: Entry[] = [{ tileId: 100, offset: 1, length: 1, runLength: 2 }];
  let entry = findTile(entries, 101);
  assert.strictEqual(entry?.offset, 1);
  assert.strictEqual(entry?.length, 1);

  entries = [
    { tileId: 100, offset: 1, length: 1, runLength: 1 },
    { tileId: 150, offset: 2, length: 2, runLength: 2 },
  ];
  entry = findTile(entries, 151);
  assert.strictEqual(entry?.offset, 2);
  assert.strictEqual(entry?.length, 2);

  entries = [
    { tileId: 50, offset: 1, length: 1, runLength: 2 },
    { tileId: 100, offset: 2, length: 2, runLength: 1 },
    { tileId: 150, offset: 3, length: 3, runLength: 1 },
  ];
  entry = findTile(entries, 51);
  assert.strictEqual(entry?.offset, 1);
  assert.strictEqual(entry?.length, 1);
});

test("leaf search", () => {
  const entries: Entry[] = [
    { tileId: 100, offset: 1, length: 1, runLength: 0 },
  ];
  const entry = findTile(entries, 150);
  assert.strictEqual(entry?.offset, 1);
  assert.strictEqual(entry?.length, 1);
});

// inefficient method only for testing
class TestNodeFileSource implements Source {
  buffer: ArrayBuffer;
  path: string;
  key: string;
  etag?: string;

  constructor(path: string, key: string) {
    this.path = path;
    this.buffer = fs.readFileSync(path);
    this.key = key;
  }

  getKey() {
    return this.key;
  }

  replaceData(path: string) {
    this.path = path;
    this.buffer = fs.readFileSync(path);
  }

  async getBytes(offset: number, length: number): Promise<RangeResponse> {
    const slice = new Uint8Array(this.buffer.slice(offset, offset + length))
      .buffer;
    return { data: slice, etag: this.etag };
  }
}

// echo '{"type":"Polygon","coordinates":[[[0,0],[0,1],[1,1],[1,0],[0,0]]]}' | ./tippecanoe -zg -o test_fixture_1.pmtiles
test("cache getHeader", async () => {
  const source = new TestNodeFileSource(
    "test/data/test_fixture_1.pmtiles",
    "1"
  );
  const cache = new SharedPromiseCache();
  const header = await cache.getHeader(source);
  assert.strictEqual(header.rootDirectoryOffset, 127);
  assert.strictEqual(header.rootDirectoryLength, 25);
  assert.strictEqual(header.jsonMetadataOffset, 152);
  assert.strictEqual(header.jsonMetadataLength, 247);
  assert.strictEqual(header.leafDirectoryOffset, 0);
  assert.strictEqual(header.leafDirectoryLength, 0);
  assert.strictEqual(header.tileDataOffset, 399);
  assert.strictEqual(header.tileDataLength, 69);
  assert.strictEqual(header.numAddressedTiles, 1);
  assert.strictEqual(header.numTileEntries, 1);
  assert.strictEqual(header.numTileContents, 1);
  assert.strictEqual(header.clustered, false);
  assert.strictEqual(header.internalCompression, 2);
  assert.strictEqual(header.tileCompression, 2);
  assert.strictEqual(header.tileType, 1);
  assert.strictEqual(header.minZoom, 0);
  assert.strictEqual(header.maxZoom, 0);
  assert.strictEqual(header.minLon, 0);
  assert.strictEqual(header.minLat, 0);
  // assert.strictEqual(header.maxLon,1); // TODO fix me
  assert.strictEqual(header.maxLat, 1);
});

test("getUint64", async () => {
  const view = new DataView(new ArrayBuffer(8));
  view.setBigUint64(0, 0n, true);
  assert.strictEqual(getUint64(view, 0), 0);
  view.setBigUint64(0, 1n, true);
  assert.strictEqual(getUint64(view, 0), 1);
  view.setBigUint64(0, 9007199254740991n, true);
  assert.strictEqual(getUint64(view, 0), 9007199254740991);
});

test("cache check against empty", async () => {
  const source = new TestNodeFileSource("test/data/empty.pmtiles", "1");
  const cache = new SharedPromiseCache();
  assert.rejects(async () => {
    await cache.getHeader(source);
  });
});

test("cache check magic number", async () => {
  const source = new TestNodeFileSource("test/data/invalid.pmtiles", "1");
  const cache = new SharedPromiseCache();
  assert.rejects(async () => {
    await cache.getHeader(source);
  });
});

test("cache check future spec version", async () => {
  const source = new TestNodeFileSource("test/data/invalid_v4.pmtiles", "1");
  const cache = new SharedPromiseCache();
  assert.rejects(async () => {
    await cache.getHeader(source);
  });
});

test("cache getDirectory", async () => {
  const source = new TestNodeFileSource(
    "test/data/test_fixture_1.pmtiles",
    "1"
  );

  const cache = new SharedPromiseCache(6400);
  const header = await cache.getHeader(source);

  // prepopulates the root directory
  assert.strictEqual(cache.cache.size, 2);

  const directory = await cache.getDirectory(
    source,
    header.rootDirectoryOffset,
    header.rootDirectoryLength,
    header
  );
  assert.strictEqual(directory.length, 1);
  assert.strictEqual(directory[0].tileId, 0);
  assert.strictEqual(directory[0].offset, 0);
  assert.strictEqual(directory[0].length, 69);
  assert.strictEqual(directory[0].runLength, 1);

  for (const v of cache.cache.values()) {
    assert.ok(v.lastUsed > 0);
  }
});

test("multiple sources in a single cache", async () => {
  const cache = new SharedPromiseCache();
  const source1 = new TestNodeFileSource(
    "test/data/test_fixture_1.pmtiles",
    "1"
  );
  const source2 = new TestNodeFileSource(
    "test/data/test_fixture_1.pmtiles",
    "2"
  );
  await cache.getHeader(source1);
  assert.strictEqual(cache.cache.size, 2);
  await cache.getHeader(source2);
  assert.strictEqual(cache.cache.size, 4);
});

test("etag change", async () => {
  const p = new PMTiles("http://localhost:1337/example.pmtiles");
  const tile = await p.getZxy(0, 0, 0);
  // header + tile
  assert.strictEqual(2, mockserver.numRequests);
  mockserver.etag = "etag_2";
  await p.getZxy(0, 0, 0);
  // tile + header again + tile
  assert.strictEqual(5, mockserver.numRequests);
});

test("weak etags", async () => {
  mockserver.reset();
  const p = new PMTiles("http://localhost:1337/example.pmtiles");
  const tile = await p.getZxy(0, 0, 0);
  // header + tile
  assert.strictEqual(2, mockserver.numRequests);
  mockserver.etag = "W/weak_etag";
  await p.getZxy(0, 0, 0);
  assert.strictEqual(3, mockserver.numRequests);
});

// handle < 16384 bytes archive case
// handle DigitalOcean case returning 200 instead of 206

test("cache pruning by byte size", async () => {
  const cache = new SharedPromiseCache(2);
  cache.cache.set("0", { lastUsed: 0, data: Promise.resolve([]) });
  cache.cache.set("1", { lastUsed: 1, data: Promise.resolve([]) });
  cache.cache.set("2", { lastUsed: 2, data: Promise.resolve([]) });
  cache.prune();
  assert.strictEqual(cache.cache.size, 2);
  assert.ok(cache.cache.get("2"));
  assert.ok(cache.cache.get("1"));
  assert.ok(!cache.cache.get("0"));
});

test("pmtiles get metadata", async () => {
  const source = new TestNodeFileSource(
    "test/data/test_fixture_1.pmtiles",
    "1"
  );
  const p = new PMTiles(source);
  const metadata = await p.getMetadata();
  assert.ok((metadata as { name: string }).name);
});

// echo '{"type":"Polygon","coordinates":[[[0,0],[0,1],[1,0],[0,0]]]}' | ./tippecanoe -zg -o test_fixture_2.pmtiles

test("get file extension", async () => {
  assert.equal("", tileTypeExt(TileType.Unknown));
  assert.equal(".mvt", tileTypeExt(TileType.Mvt));
  assert.equal(".png", tileTypeExt(TileType.Png));
  assert.equal(".jpg", tileTypeExt(TileType.Jpeg));
  assert.equal(".webp", tileTypeExt(TileType.Webp));
  assert.equal(".avif", tileTypeExt(TileType.Avif));
});

interface TileJsonLike {
  tilejson: string;
  scheme: string;
  tiles: string[];
  description?: string;
  name?: string;
  attribution?: string;
  version?: string;
}

test("pmtiles get TileJSON", async () => {
  const source = new TestNodeFileSource(
    "test/data/test_fixture_1.pmtiles",
    "1"
  );
  const p = new PMTiles(source);
  const tilejson = (await p.getTileJson(
    "https://example.com/foo"
  )) as TileJsonLike;
  assert.equal("3.0.0", tilejson.tilejson);
  assert.equal("xyz", tilejson.scheme);
  assert.equal("https://example.com/foo/{z}/{x}/{y}.mvt", tilejson.tiles[0]);
  assert.equal(undefined, tilejson.attribution);
  assert.equal("test_fixture_1.pmtiles", tilejson.description);
  assert.equal("test_fixture_1.pmtiles", tilejson.name);
  assert.equal("2", tilejson.version);
});

describe("user agent", async () => {
  beforeEach(() => {
    // @ts-ignore
    global.navigator = { userAgent: "Windows Chrome" };
  });

  afterEach(() => {
    // @ts-ignore
    global.navigator.userAgent = undefined;
  });

  it("works around caching bug on chrome on windows", async () => {
    const p = new PMTiles("http://localhost:1337/example.pmtiles");
    await p.getZxy(0, 0, 0);
    assert.equal("no-store", mockserver.lastCache);
  });
});
