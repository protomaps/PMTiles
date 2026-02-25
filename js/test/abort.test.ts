import assert from "node:assert";
import { describe, test } from "node:test";

import {
  Entry,
  PMTiles,
  RangeResponse,
  SharedPromiseCache,
  Source,
} from "../src/index";

/**
 * A Source where each getBytes call can be individually controlled:
 * paused, resolved, or rejected. Tracks calls for assertions.
 */
class ControllableSource implements Source {
  key: string;
  calls: {
    offset: number;
    length: number;
    signal?: AbortSignal;
    resolve: (resp: RangeResponse) => void;
    reject: (err: Error) => void;
  }[];

  constructor(key: string) {
    this.key = key;
    this.calls = [];
  }

  getKey() {
    return this.key;
  }

  async getBytes(
    offset: number,
    length: number,
    signal?: AbortSignal,
    etag?: string
  ): Promise<RangeResponse> {
    return new Promise<RangeResponse>((resolve, reject) => {
      this.calls.push({ offset, length, signal, resolve, reject });
      if (signal) {
        signal.addEventListener(
          "abort",
          () => {
            reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
          },
          { once: true }
        );
      }
    });
  }
}

/** Encode a number as a varint into buf at pos, return new pos. */
function writeVarint(buf: Uint8Array, pos: number, value: number): number {
  while (value >= 0x80) {
    buf[pos++] = (value & 0x7f) | 0x80;
    value >>>= 7;
  }
  buf[pos++] = value;
  return pos;
}

/**
 * Serialize a directory (array of entries) into the PMTiles columnar varint format.
 * Entries must be sorted by tileId.
 */
function serializeDirectory(entries: Entry[]): ArrayBuffer {
  const buf = new Uint8Array(1024);
  let pos = 0;

  // numEntries
  pos = writeVarint(buf, pos, entries.length);

  // delta-encoded tileIds
  let lastId = 0;
  for (const e of entries) {
    pos = writeVarint(buf, pos, e.tileId - lastId);
    lastId = e.tileId;
  }

  // runLengths
  for (const e of entries) {
    pos = writeVarint(buf, pos, e.runLength);
  }

  // lengths
  for (const e of entries) {
    pos = writeVarint(buf, pos, e.length);
  }

  // offsets: first entry stores offset+1, subsequent entries store 0 if
  // offset == prev.offset + prev.length, else offset+1
  for (let i = 0; i < entries.length; i++) {
    if (i > 0 && entries[i].offset === entries[i - 1].offset + entries[i - 1].length) {
      pos = writeVarint(buf, pos, 0);
    } else {
      pos = writeVarint(buf, pos, entries[i].offset + 1);
    }
  }

  return buf.slice(0, pos).buffer;
}

/**
 * Build a minimal valid 16KB PMTiles buffer containing a header whose root
 * directory has a single leaf-pointer entry (runLength=0), forcing tile
 * lookups to make a separate HTTP request for the leaf directory.
 *
 * Returns { data, leafDirOffset } so tests know where the leaf lives.
 */
function buildHeaderWithLeaf() {
  const LEAF_DIR_OFFSET = 20000;
  const LEAF_DIR_LENGTH = 100;
  const TILE_DATA_OFFSET = 30000;

  // Root directory: one leaf pointer entry covering all tileIds from 0
  const rootDirBuf = serializeDirectory([
    { tileId: 0, runLength: 0, length: LEAF_DIR_LENGTH, offset: 0 },
  ]);

  const ROOT_DIR_OFFSET = 127;
  const ROOT_DIR_LENGTH = rootDirBuf.byteLength;
  const JSON_OFFSET = ROOT_DIR_OFFSET + ROOT_DIR_LENGTH;

  const buf = new ArrayBuffer(16384);
  const view = new DataView(buf);
  const u8 = new Uint8Array(buf);

  // Magic: "PM" as little-endian uint16 = 0x4d50
  view.setUint16(0, 0x4d50, true);
  // Spec version at byte 7
  u8[7] = 3;

  function setUint64(offset: number, value: number) {
    view.setBigUint64(offset, BigInt(value), true);
  }

  // Header fields (offsets match bytesToHeader in index.ts)
  setUint64(8, ROOT_DIR_OFFSET);    // rootDirectoryOffset
  setUint64(16, ROOT_DIR_LENGTH);   // rootDirectoryLength
  setUint64(24, JSON_OFFSET);       // jsonMetadataOffset
  setUint64(32, 0);                 // jsonMetadataLength
  setUint64(40, LEAF_DIR_OFFSET);   // leafDirectoryOffset
  setUint64(48, LEAF_DIR_LENGTH);   // leafDirectoryLength
  setUint64(56, TILE_DATA_OFFSET);  // tileDataOffset
  setUint64(64, 1000);              // tileDataLength
  setUint64(72, 1);                 // numAddressedTiles
  setUint64(80, 1);                 // numTileEntries
  setUint64(88, 1);                 // numTileContents
  u8[96] = 0;  // clustered = false
  u8[97] = 1;  // internalCompression = None
  u8[98] = 1;  // tileCompression = None
  u8[99] = 1;  // tileType = MVT
  u8[100] = 0; // minZoom
  u8[101] = 4; // maxZoom
  view.setInt32(110, 10000000, true); // maxLon
  view.setInt32(114, 10000000, true); // maxLat

  // Write root directory into the buffer
  u8.set(new Uint8Array(rootDirBuf), ROOT_DIR_OFFSET);

  return { data: buf, leafDirOffset: LEAF_DIR_OFFSET, tileDataOffset: TILE_DATA_OFFSET };
}

describe("directory abort cancellation", () => {
  test("getZxy bails out early when signal is already aborted after header fetch", async () => {
    let dirFetchAttempted = false;
    const { data: headerData } = buildHeaderWithLeaf();

    const source: Source = {
      getKey: () => "test",
      getBytes: async (
        offset: number,
        length: number,
        signal?: AbortSignal
      ): Promise<RangeResponse> => {
        if (offset === 0) {
          return { data: new Uint8Array(headerData).slice(0, length).buffer };
        }
        dirFetchAttempted = true;
        return { data: new ArrayBuffer(0) };
      },
    };

    const ac = new AbortController();
    const p = new PMTiles(source);

    // Pre-warm header cache
    await p.getHeader();

    // Abort before calling getZxy
    ac.abort();

    await assert.rejects(
      () => p.getZxy(1, 0, 0, ac.signal),
      (err: Error) => err.name === "AbortError"
    );

    assert.strictEqual(
      dirFetchAttempted,
      false,
      "leaf directory fetch should not be attempted after signal already aborted"
    );
  });

  test("SharedPromiseCache cancels directory fetch when all callers abort", async () => {
    const { data: headerData, leafDirOffset } = buildHeaderWithLeaf();
    const source = new ControllableSource("test");
    const cache = new SharedPromiseCache();

    // Populate header in cache
    const headerPromise = cache.getHeader(source);
    assert.strictEqual(source.calls.length, 1);
    source.calls[0].resolve({
      data: new Uint8Array(headerData).slice(0, 16384).buffer,
    });
    const header = await headerPromise;

    const ac1 = new AbortController();
    const ac2 = new AbortController();

    const dirPromise1 = cache.getDirectory(
      source, leafDirOffset, 100, header, ac1.signal
    );
    const dirPromise2 = cache.getDirectory(
      source, leafDirOffset, 100, header, ac2.signal
    );

    // Only one underlying getBytes call for the directory (deduplicated)
    assert.strictEqual(source.calls.length, 2); // header + 1 directory
    const dirCall = source.calls[1];
    assert.ok(dirCall.signal, "directory fetch should have an AbortSignal");
    assert.strictEqual(dirCall.signal.aborted, false);

    // Abort first caller - fetch should NOT cancel yet
    ac1.abort();
    assert.strictEqual(dirCall.signal.aborted, false,
      "fetch must not abort with one caller remaining");

    // Abort second caller - fetch SHOULD cancel now
    ac2.abort();
    assert.strictEqual(dirCall.signal.aborted, true,
      "fetch should abort when all callers have cancelled");

    // Both promises reject
    await assert.rejects(dirPromise1);
    await assert.rejects(dirPromise2);

    // Cache entry should be evicted
    const cacheKey = `test||${leafDirOffset}|100`;
    assert.strictEqual(cache.cache.has(cacheKey), false);
    assert.strictEqual(cache.pendingFetches.has(cacheKey), false);
  });

  test("SharedPromiseCache does NOT cancel when some callers are still active", async () => {
    const { data: headerData, leafDirOffset } = buildHeaderWithLeaf();
    const source = new ControllableSource("test");
    const cache = new SharedPromiseCache();

    const headerPromise = cache.getHeader(source);
    source.calls[0].resolve({
      data: new Uint8Array(headerData).slice(0, 16384).buffer,
    });
    const header = await headerPromise;

    const ac1 = new AbortController();
    const ac2 = new AbortController();

    cache.getDirectory(source, leafDirOffset, 100, header, ac1.signal);
    cache.getDirectory(source, leafDirOffset, 100, header, ac2.signal);

    const dirCall = source.calls[1];

    // Abort only one caller
    ac1.abort();
    assert.strictEqual(dirCall.signal!.aborted, false,
      "fetch must not abort while one caller remains active");

    // Resolve for the remaining caller
    const leafDir = serializeDirectory([
      { tileId: 0, runLength: 1, length: 50, offset: 0 },
    ]);
    dirCall.resolve({ data: leafDir });
  });

  test("SharedPromiseCache pins fetch when a later caller has no signal", async () => {
    const { data: headerData, leafDirOffset } = buildHeaderWithLeaf();
    const source = new ControllableSource("test");
    const cache = new SharedPromiseCache();

    const headerPromise = cache.getHeader(source);
    source.calls[0].resolve({
      data: new Uint8Array(headerData).slice(0, 16384).buffer,
    });
    const header = await headerPromise;

    const ac1 = new AbortController();

    // First caller has a signal
    cache.getDirectory(source, leafDirOffset, 100, header, ac1.signal);
    // Second caller has NO signal → pins the fetch
    cache.getDirectory(source, leafDirOffset, 100, header, undefined);

    const dirCall = source.calls[1];

    // Abort the signaled caller — fetch must NOT be cancelled (pinned)
    ac1.abort();
    assert.strictEqual(dirCall.signal!.aborted, false,
      "fetch must not abort when pinned by an unsignaled caller");
  });

  test("SharedPromiseCache pins fetch when first caller has no signal", async () => {
    const { data: headerData, leafDirOffset } = buildHeaderWithLeaf();
    const source = new ControllableSource("test");
    const cache = new SharedPromiseCache();

    const headerPromise = cache.getHeader(source);
    source.calls[0].resolve({
      data: new Uint8Array(headerData).slice(0, 16384).buffer,
    });
    const header = await headerPromise;

    const ac1 = new AbortController();

    // First caller has NO signal → pinned immediately
    cache.getDirectory(source, leafDirOffset, 100, header, undefined);
    // Second caller has a signal
    cache.getDirectory(source, leafDirOffset, 100, header, ac1.signal);

    const dirCall = source.calls[1];

    ac1.abort();
    assert.strictEqual(dirCall.signal!.aborted, false,
      "fetch must not abort when pinned by an unsignaled initial caller");
  });

  test("completed fetch is not affected by late abort", async () => {
    const { data: headerData, leafDirOffset } = buildHeaderWithLeaf();
    const source = new ControllableSource("test");
    const cache = new SharedPromiseCache();

    const headerPromise = cache.getHeader(source);
    source.calls[0].resolve({
      data: new Uint8Array(headerData).slice(0, 16384).buffer,
    });
    const header = await headerPromise;

    const ac1 = new AbortController();

    const dirPromise = cache.getDirectory(
      source, leafDirOffset, 100, header, ac1.signal
    );

    // Resolve the directory fetch BEFORE aborting
    const leafDir = serializeDirectory([
      { tileId: 0, runLength: 1, length: 50, offset: 0 },
    ]);
    source.calls[1].resolve({ data: leafDir });
    const directory = await dirPromise;
    assert.strictEqual(directory.length, 1);

    // Now abort AFTER completion
    ac1.abort();

    // The cache entry must still be present
    const cacheKey = `test||${leafDirOffset}|100`;
    assert.strictEqual(cache.cache.has(cacheKey), true,
      "cache entry must survive late abort");

    // Subsequent reads still work
    const dir2 = await cache.getDirectory(
      source, leafDirOffset, 100, header
    );
    assert.strictEqual(dir2.length, 1);
  });

  test("evicted cache entry allows fresh re-fetch", async () => {
    const { data: headerData, leafDirOffset } = buildHeaderWithLeaf();
    const source = new ControllableSource("test");
    const cache = new SharedPromiseCache();

    const headerPromise = cache.getHeader(source);
    source.calls[0].resolve({
      data: new Uint8Array(headerData).slice(0, 16384).buffer,
    });
    const header = await headerPromise;

    const ac1 = new AbortController();

    const dirPromise1 = cache.getDirectory(
      source, leafDirOffset, 100, header, ac1.signal
    );

    // Abort → cancels fetch, evicts cache entry
    ac1.abort();
    await assert.rejects(dirPromise1);

    // New caller should trigger a fresh fetch
    const dirPromise2 = cache.getDirectory(
      source, leafDirOffset, 100, header
    );

    assert.strictEqual(source.calls.length, 3,
      "a fresh getBytes call should be made after eviction");

    // Resolve the new fetch
    const leafDir = serializeDirectory([
      { tileId: 0, runLength: 1, length: 50, offset: 0 },
    ]);
    source.calls[2].resolve({ data: leafDir });

    const directory = await dirPromise2;
    assert.strictEqual(directory.length, 1);
  });

  test("getZxy passes signal through to leaf directory fetch", async () => {
    const { data: headerData } = buildHeaderWithLeaf();
    const source = new ControllableSource("test");
    const p = new PMTiles(source);

    const ac = new AbortController();
    const tilePromise = p.getZxy(1, 0, 0, ac.signal);

    // Resolve header fetch
    source.calls[0].resolve({
      data: new Uint8Array(headerData).slice(0, 16384).buffer,
    });

    // Wait for the leaf directory fetch to be initiated
    await new Promise((r) => setTimeout(r, 10));
    assert.strictEqual(source.calls.length, 2, "leaf directory fetch expected");

    const dirCall = source.calls[1];
    assert.ok(dirCall.signal, "directory fetch should have a signal");
    assert.strictEqual(dirCall.signal.aborted, false);

    // Abort the tile request — single caller so directory fetch should cancel
    ac.abort();
    assert.strictEqual(dirCall.signal.aborted, true,
      "directory fetch signal should be aborted");

    await assert.rejects(tilePromise);
  });

  test("getZxy does not start tile data fetch if signal aborts before directory resolves", async () => {
    const { data: headerData } = buildHeaderWithLeaf();
    const source = new ControllableSource("test");
    const p = new PMTiles(source);

    const ac = new AbortController();
    const tilePromise = p.getZxy(1, 0, 0, ac.signal);

    // Resolve header fetch
    source.calls[0].resolve({
      data: new Uint8Array(headerData).slice(0, 16384).buffer,
    });

    // Wait for leaf directory fetch to begin
    await new Promise((r) => setTimeout(r, 10));
    assert.strictEqual(source.calls.length, 2);

    // Abort the signal first — this cancels the directory fetch (single caller).
    ac.abort();

    // Let microtasks and rejections settle
    await assert.rejects(tilePromise);

    // Only header + directory calls were made, no tile data fetch.
    assert.strictEqual(source.calls.length, 2,
      "tile data fetch should not start after signal abort");
  });

  test("three callers: fetch cancels only when last one aborts", async () => {
    const { data: headerData, leafDirOffset } = buildHeaderWithLeaf();
    const source = new ControllableSource("test");
    const cache = new SharedPromiseCache();

    const headerPromise = cache.getHeader(source);
    source.calls[0].resolve({
      data: new Uint8Array(headerData).slice(0, 16384).buffer,
    });
    const header = await headerPromise;

    const ac1 = new AbortController();
    const ac2 = new AbortController();
    const ac3 = new AbortController();

    const p1 = cache.getDirectory(source, leafDirOffset, 100, header, ac1.signal);
    const p2 = cache.getDirectory(source, leafDirOffset, 100, header, ac2.signal);
    const p3 = cache.getDirectory(source, leafDirOffset, 100, header, ac3.signal);

    const dirCall = source.calls[1];

    ac1.abort();
    assert.strictEqual(dirCall.signal!.aborted, false, "2 callers remain");

    ac2.abort();
    assert.strictEqual(dirCall.signal!.aborted, false, "1 caller remains");

    ac3.abort();
    assert.strictEqual(dirCall.signal!.aborted, true, "all callers aborted");

    // Catch all rejections
    await assert.rejects(p1);
    await assert.rejects(p2);
    await assert.rejects(p3);
  });
});
