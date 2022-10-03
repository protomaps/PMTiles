import { test } from "zora";

// tests run in node, for convenience
// we don't need to typecheck all of it
// @ts-ignore
import fs from "fs";

import {
	Entry,
	zxyToTileId,
	tileIdToZxy,
	findTile,
	readVarint,
	Cache,
	BufferPosition,
	Source,
	Response,
	VersionMismatch,
	PMTiles,
} from "./v3";

test("varint", (assertion) => {
	let b: BufferPosition = {
		buf: new Uint8Array([0, 1, 127, 0xe5, 0x8e, 0x26]),
		pos: 0,
	};
	assertion.eq(readVarint(b), 0);
	assertion.eq(readVarint(b), 1);
	assertion.eq(readVarint(b), 127);
	assertion.eq(readVarint(b), 624485);
	b = {
		buf: new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x0f]),
		pos: 0,
	};
	assertion.eq(readVarint(b), 9007199254740991);
});

test("zxy to tile id", (assertion) => {
	assertion.eq(zxyToTileId(0, 0, 0), 0);
	assertion.eq(zxyToTileId(1, 0, 0), 1);
	assertion.eq(zxyToTileId(1, 0, 1), 2);
	assertion.eq(zxyToTileId(1, 1, 1), 3);
	assertion.eq(zxyToTileId(1, 1, 0), 4);
	assertion.eq(zxyToTileId(2, 0, 0), 5);
});

test("tile id to zxy", (assertion) => {
	assertion.eq(tileIdToZxy(0), [0, 0, 0]);
	assertion.eq(tileIdToZxy(1), [1, 0, 0]);
	assertion.eq(tileIdToZxy(2), [1, 0, 1]);
	assertion.eq(tileIdToZxy(3), [1, 1, 1]);
	assertion.eq(tileIdToZxy(4), [1, 1, 0]);
	assertion.eq(tileIdToZxy(5), [2, 0, 0]);
});

test("a lot of tiles", (assertion) => {
	for (let z = 0; z < 9; z++) {
		for (let x = 0; x < 1 << z; x++) {
			for (let y = 0; y < 1 << z; y++) {
				const result = tileIdToZxy(zxyToTileId(z, x, y));
				if (result[0] !== z || result[1] !== x || result[2] !== y) {
					assertion.fail("roundtrip failed");
				}
			}
		}
	}
});

test("tile search for missing entry", (assertion) => {
	const entries: Entry[] = [];
	assertion.eq(findTile(entries, 101), null);
});

test("tile search for first entry == id", (assertion) => {
	const entries: Entry[] = [{ tileId: 100, offset: 1, length: 1, runLength: 1 }];
	const entry = findTile(entries, 100)!;
	assertion.eq(entry.offset, 1);
	assertion.eq(entry.length, 1);
	assertion.eq(findTile(entries, 101), null);
});

test("tile search with multiple tile entries", (assertion) => {
	let entries: Entry[] = [{ tileId: 100, offset: 1, length: 1, runLength: 2 }];
	let entry = findTile(entries, 101)!;
	assertion.eq(entry.offset, 1);
	assertion.eq(entry.length, 1);

	entries = [
		{ tileId: 100, offset: 1, length: 1, runLength: 1 },
		{ tileId: 150, offset: 2, length: 2, runLength: 2 },
	];
	entry = findTile(entries, 151)!;
	assertion.eq(entry.offset, 2);
	assertion.eq(entry.length, 2);

	entries = [
		{ tileId: 50, offset: 1, length: 1, runLength: 2 },
		{ tileId: 100, offset: 2, length: 2, runLength: 1 },
		{ tileId: 150, offset: 3, length: 3, runLength: 1 },
	];
	entry = findTile(entries, 51)!;
	assertion.eq(entry.offset, 1);
	assertion.eq(entry.length, 1);
});

test("leaf search", (assertion) => {
	const entries: Entry[] = [{ tileId: 100, offset: 1, length: 1, runLength: 0 }];
	const entry = findTile(entries, 150);
	assertion.eq(entry!.offset, 1);
	assertion.eq(entry!.length, 1);
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

	async getBytes(
		offset: number,
		length: number
	): Promise<Response> {
		const slice = new Uint8Array(this.buffer.slice(offset, offset + length))
			.buffer;
		return {data:slice, etag:this.etag};
	}
}

// echo '{"type":"Polygon","coordinates":[[[0,0],[0,1],[1,1],[1,0],[0,0]]]}' | ./tippecanoe -zg -o test_fixture_1.pmtiles
test("cache getHeader", async (assertion) => {
	const source = new TestNodeFileSource("test_fixture_1.pmtiles", "1");
	const cache = new Cache();
	const header = await cache.getHeader(source);
	assertion.eq(header.rootDirectoryOffset, 122);
	assertion.eq(header.rootDirectoryLength, 25);
	assertion.eq(header.jsonMetadataOffset, 147);
	assertion.eq(header.jsonMetadataLength, 239);
	assertion.eq(header.leafDirectoryOffset, 0);
	assertion.eq(header.leafDirectoryLength, 0);
	assertion.eq(header.tileDataOffset, 386);
	assertion.eq(header.tileDataLength, 69);
	assertion.eq(header.numAddressedTiles, 1);
	assertion.eq(header.numTileEntries, 1);
	assertion.eq(header.numTileContents, 1);
	assertion.eq(header.clustered, false);
	assertion.eq(header.internalCompression, 1);
	assertion.eq(header.tileCompression, 1);
	assertion.eq(header.tileType, 1);
	assertion.eq(header.minZoom, 0);
	assertion.eq(header.maxZoom, 0);
	assertion.eq(header.minLon, 0);
	assertion.eq(header.minLat, 0);
	// assertion.eq(header.maxLon,1); // TODO fix me
	assertion.eq(header.maxLat, 1);
});

test("cache check against empty", async (assertion) => {
	const source = new TestNodeFileSource("empty.pmtiles", "1");
	const cache = new Cache();
	try {
		await cache.getHeader(source);
		assertion.fail("Should have thrown");
	} catch (e) {
		assertion.ok(e instanceof Error);
	}
});

test("cache check magic number", async (assertion) => {
	const source = new TestNodeFileSource("invalid.pmtiles", "1");
	const cache = new Cache();
	try {
		await cache.getHeader(source);
		assertion.fail("Should have thrown");
	} catch (e) {
		console.log(e);
		assertion.ok(e instanceof Error);
	}
});

test("cache getDirectory", async (assertion) => {
	const source = new TestNodeFileSource("test_fixture_1.pmtiles", "1");

	let cache = new Cache(6400, false);
	let header = await cache.getHeader(source);
	assertion.eq(cache.cache.size, 1);

	cache = new Cache(6400, true);
	header = await cache.getHeader(source);

	// prepopulates the root directory
	assertion.eq(cache.cache.size, 2);

	const directory = await cache.getDirectory(
		source,
		header.rootDirectoryOffset,
		header.rootDirectoryLength,
		header
	);
	assertion.eq(directory.length, 1);
	assertion.eq(directory[0].tileId, 0);
	assertion.eq(directory[0].offset, 0);
	assertion.eq(directory[0].length, 69);
	assertion.eq(directory[0].runLength, 1);

	for (const v of cache.cache.values()) {
		assertion.ok(v.lastUsed > 0);
		assertion.ok(v.size > 0);
	}
});

test("multiple sources in a single cache", async (assertion) => {
	const cache = new Cache();
	const source1 = new TestNodeFileSource("test_fixture_1.pmtiles", "1");
	const source2 = new TestNodeFileSource("test_fixture_1.pmtiles", "2");
	await cache.getHeader(source1);
	assertion.eq(cache.cache.size, 2);
	await cache.getHeader(source2);
	assertion.eq(cache.cache.size, 4);
});

test("etags are part of key", async (assertion) => {
	const cache = new Cache(6400, false);
	const source = new TestNodeFileSource("test_fixture_1.pmtiles", "1");
	source.etag = "etag_1";
	let header = await cache.getHeader(source);
	assertion.eq(header.etag, "etag_1");

	source.etag = "etag_2";

	try {
		await cache.getDirectory(
			source,
			header.rootDirectoryOffset,
			header.rootDirectoryLength,
			header
		);
		assertion.fail("Should have thrown");
	} catch (e) {
		assertion.ok(e instanceof VersionMismatch);
	}
	cache.invalidate(source);
	header = await cache.getHeader(source);
	assertion.ok(
		await cache.getDirectory(
			source,
			header.rootDirectoryOffset,
			header.rootDirectoryLength,
			header
		)
	);
});

test("cache pruning by byte size", async (assertion) => {
	const cache = new Cache(1000, false);
	cache.cache.set("0", { lastUsed: 0, data: Promise.resolve([]), size: 400 });
	cache.cache.set("1", { lastUsed: 1, data: Promise.resolve([]), size: 200 });
	cache.cache.set("2", { lastUsed: 2, data: Promise.resolve([]), size: 900 });
	cache.sizeBytes = 900 + 200 + 400;
	cache.prune();
	assertion.eq(cache.cache.size, 1);
	assertion.ok(cache.cache.get("2"));
});

test("pmtiles get metadata", async (assertion) => {
	const source = new TestNodeFileSource("test_fixture_1.pmtiles", "1");
	const p = new PMTiles(source);
	const metadata = await p.getMetadata();
	assertion.ok(metadata.name);
});

// echo '{"type":"Polygon","coordinates":[[[0,0],[0,1],[1,0],[0,0]]]}' | ./tippecanoe -zg -o test_fixture_2.pmtiles
test("pmtiles handle retries", async (assertion) => {
	const source = new TestNodeFileSource("test_fixture_1.pmtiles", "1");
	source.etag = "1";
	const p = new PMTiles(source);
	const metadata = await p.getMetadata();
	assertion.ok(metadata.name);
	source.etag = "2";
	source.replaceData("test_fixture_2.pmtiles");
	assertion.ok(await p.getZxy(0, 0, 0));
});
