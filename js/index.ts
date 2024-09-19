import { decompressSync } from "fflate";
import v2 from "./v2";
export * from "./adapters";

/** @hidden */
export interface BufferPosition {
  buf: Uint8Array;
  pos: number;
}

function toNum(low: number, high: number): number {
  return (high >>> 0) * 0x100000000 + (low >>> 0);
}

function readVarintRemainder(l: number, p: BufferPosition): number {
  const buf = p.buf;
  let b = buf[p.pos++];
  let h = (b & 0x70) >> 4;
  if (b < 0x80) return toNum(l, h);
  b = buf[p.pos++];
  h |= (b & 0x7f) << 3;
  if (b < 0x80) return toNum(l, h);
  b = buf[p.pos++];
  h |= (b & 0x7f) << 10;
  if (b < 0x80) return toNum(l, h);
  b = buf[p.pos++];
  h |= (b & 0x7f) << 17;
  if (b < 0x80) return toNum(l, h);
  b = buf[p.pos++];
  h |= (b & 0x7f) << 24;
  if (b < 0x80) return toNum(l, h);
  b = buf[p.pos++];
  h |= (b & 0x01) << 31;
  if (b < 0x80) return toNum(l, h);
  throw new Error("Expected varint not more than 10 bytes");
}

/** @hidden */
export function readVarint(p: BufferPosition): number {
  const buf = p.buf;
  let b = buf[p.pos++];
  let val = b & 0x7f;
  if (b < 0x80) return val;
  b = buf[p.pos++];
  val |= (b & 0x7f) << 7;
  if (b < 0x80) return val;
  b = buf[p.pos++];
  val |= (b & 0x7f) << 14;
  if (b < 0x80) return val;
  b = buf[p.pos++];
  val |= (b & 0x7f) << 21;
  if (b < 0x80) return val;
  b = buf[p.pos];
  val |= (b & 0x0f) << 28;

  return readVarintRemainder(val, p);
}

function rotate(n: number, xy: number[], rx: number, ry: number): void {
  if (ry === 0) {
    if (rx === 1) {
      xy[0] = n - 1 - xy[0];
      xy[1] = n - 1 - xy[1];
    }
    const t = xy[0];
    xy[0] = xy[1];
    xy[1] = t;
  }
}

function idOnLevel(z: number, pos: number): [number, number, number] {
  const n = 2 ** z;
  let rx = pos;
  let ry = pos;
  let t = pos;
  const xy = [0, 0];
  let s = 1;
  while (s < n) {
    rx = 1 & (t / 2);
    ry = 1 & (t ^ rx);
    rotate(s, xy, rx, ry);
    xy[0] += s * rx;
    xy[1] += s * ry;
    t = t / 4;
    s *= 2;
  }
  return [z, xy[0], xy[1]];
}

const tzValues: number[] = [
  0, 1, 5, 21, 85, 341, 1365, 5461, 21845, 87381, 349525, 1398101, 5592405,
  22369621, 89478485, 357913941, 1431655765, 5726623061, 22906492245,
  91625968981, 366503875925, 1466015503701, 5864062014805, 23456248059221,
  93824992236885, 375299968947541, 1501199875790165,
];

/**
 * Convert Z,X,Y to a Hilbert TileID.
 */
export function zxyToTileId(z: number, x: number, y: number): number {
  if (z > 26) {
    throw Error("Tile zoom level exceeds max safe number limit (26)");
  }
  if (x > 2 ** z - 1 || y > 2 ** z - 1) {
    throw Error("tile x/y outside zoom level bounds");
  }

  const acc = tzValues[z];
  const n = 2 ** z;
  let rx = 0;
  let ry = 0;
  let d = 0;
  const xy = [x, y];
  let s = n / 2;
  while (s > 0) {
    rx = (xy[0] & s) > 0 ? 1 : 0;
    ry = (xy[1] & s) > 0 ? 1 : 0;
    d += s * s * ((3 * rx) ^ ry);
    rotate(s, xy, rx, ry);
    s = s / 2;
  }
  return acc + d;
}

/**
 * Convert a Hilbert TileID to Z,X,Y.
 */
export function tileIdToZxy(i: number): [number, number, number] {
  let acc = 0;
  const z = 0;

  for (let z = 0; z < 27; z++) {
    const numTiles = (0x1 << z) * (0x1 << z);
    if (acc + numTiles > i) {
      return idOnLevel(z, i - acc);
    }
    acc += numTiles;
  }

  throw Error("Tile zoom level exceeds max safe number limit (26)");
}

/**
 * PMTiles v3 directory entry.
 */
export interface Entry {
  tileId: number;
  offset: number;
  length: number;
  runLength: number;
}

interface MetadataLike {
  attribution?: string;
  name?: string;
  version?: string;
  // biome-ignore lint: TileJSON spec
  vector_layers?: string;
  description?: string;
}

/**
 * Enum representing a compression algorithm used.
 * 0 = unknown compression, for if you must use a different or unspecified algorithm.
 * 1 = no compression.
 */
export enum Compression {
  Unknown = 0,
  None = 1,
  Gzip = 2,
  Brotli = 3,
  Zstd = 4,
}

/**
 * Provide a decompression implementation that acts on `buf` and returns decompressed data.
 *
 * Should use the native DecompressionStream on browsers, zlib on node.
 * Should throw if the compression algorithm is not supported.
 */
export type DecompressFunc = (
  buf: ArrayBuffer,
  compression: Compression
) => Promise<ArrayBuffer>;

async function defaultDecompress(
  buf: ArrayBuffer,
  compression: Compression
): Promise<ArrayBuffer> {
  if (compression === Compression.None || compression === Compression.Unknown) {
    return buf;
  }
  if (compression === Compression.Gzip) {
    // biome-ignore lint: needed to detect DecompressionStream in browser+node+cloudflare workers
    if (typeof (globalThis as any).DecompressionStream === "undefined") {
      return decompressSync(new Uint8Array(buf));
    }
    const stream = new Response(buf).body;
    if (!stream) {
      throw Error("Failed to read response stream");
    }
    const result: ReadableStream<Uint8Array> = stream.pipeThrough(
      // biome-ignore lint: needed to detect DecompressionStream in browser+node+cloudflare workers
      new (globalThis as any).DecompressionStream("gzip")
    );
    return new Response(result).arrayBuffer();
  }
  throw Error("Compression method not supported");
}

/**
 * Describe the type of tiles stored in the archive.
 * 0 is unknown/other, 1 is "MVT" vector tiles.
 */
export enum TileType {
  Unknown = 0,
  Mvt = 1,
  Png = 2,
  Jpeg = 3,
  Webp = 4,
  Avif = 5,
}

export function tileTypeExt(t: TileType): string {
  if (t === TileType.Mvt) return ".mvt";
  if (t === TileType.Png) return ".png";
  if (t === TileType.Jpeg) return ".jpg";
  if (t === TileType.Webp) return ".webp";
  if (t === TileType.Avif) return ".avif";
  return "";
}

const HEADER_SIZE_BYTES = 127;

/**
 * PMTiles v3 header storing basic archive-level information.
 */
export interface Header {
  specVersion: number;
  rootDirectoryOffset: number;
  rootDirectoryLength: number;
  jsonMetadataOffset: number;
  jsonMetadataLength: number;
  leafDirectoryOffset: number;
  leafDirectoryLength?: number;
  tileDataOffset: number;
  tileDataLength?: number;
  numAddressedTiles: number;
  numTileEntries: number;
  numTileContents: number;
  clustered: boolean;
  internalCompression: Compression;
  tileCompression: Compression;
  tileType: TileType;
  minZoom: number;
  maxZoom: number;
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
  centerZoom: number;
  centerLon: number;
  centerLat: number;
  etag?: string;
}

/**
 * Low-level function for looking up a TileID or leaf directory inside a directory.
 */
export function findTile(entries: Entry[], tileId: number): Entry | null {
  let m = 0;
  let n = entries.length - 1;
  while (m <= n) {
    const k = (n + m) >> 1;
    const cmp = tileId - entries[k].tileId;
    if (cmp > 0) {
      m = k + 1;
    } else if (cmp < 0) {
      n = k - 1;
    } else {
      return entries[k];
    }
  }

  // at this point, m > n
  if (n >= 0) {
    if (entries[n].runLength === 0) {
      return entries[n];
    }
    if (tileId - entries[n].tileId < entries[n].runLength) {
      return entries[n];
    }
  }
  return null;
}

export interface RangeResponse {
  data: ArrayBuffer;
  etag?: string;
  expires?: string;
  cacheControl?: string;
}

/**
 * Interface for retrieving an archive from remote or local storage.
 */
export interface Source {
  getBytes: (
    offset: number,
    length: number,
    signal?: AbortSignal,
    etag?: string
  ) => Promise<RangeResponse>;

  /**
   * Return a unique string key for the archive e.g. a URL.
   */
  getKey: () => string;
}

/**
 * Use the Browser's File API, which is different from the NodeJS file API.
 * see https://developer.mozilla.org/en-US/docs/Web/API/File_API
 */
export class FileSource implements Source {
  file: File;

  constructor(file: File) {
    this.file = file;
  }

  getKey() {
    return this.file.name;
  }

  async getBytes(offset: number, length: number): Promise<RangeResponse> {
    const blob = this.file.slice(offset, offset + length);
    const a = await blob.arrayBuffer();
    return { data: a };
  }
}

/**
 * Uses the browser Fetch API to make tile requests via HTTP.
 *
 * This method does not send conditional request headers If-Match because of CORS.
 * Instead, it detects ETag mismatches via the response ETag or the 416 response code.
 *
 * This also works around browser and storage-specific edge cases.
 */
export class FetchSource implements Source {
  url: string;

  /**
   * A [Headers](https://developer.mozilla.org/en-US/docs/Web/API/Headers) object, specfying custom [Headers](https://developer.mozilla.org/en-US/docs/Web/API/Headers) set for all requests to the remote archive.
   *
   * This should be used instead of maplibre's [transformRequest](https://maplibre.org/maplibre-gl-js/docs/API/classes/Map/#example) for PMTiles archives.
   */
  customHeaders: Headers;
  /** @hidden */
  mustReload: boolean;
  /** @hidden */
  chromeWindowsNoCache: boolean;

  constructor(url: string, customHeaders: Headers = new Headers()) {
    this.url = url;
    this.customHeaders = customHeaders;
    this.mustReload = false;
    let userAgent = "";
    if ("navigator" in globalThis) {
      //biome-ignore lint: cf workers
      userAgent = (globalThis as any).navigator.userAgent || "";
    }
    const isWindows = userAgent.indexOf("Windows") > -1;
    const isChromiumBased = /Chrome|Chromium|Edg|OPR|Brave/.test(userAgent);
    this.chromeWindowsNoCache = false;
    if (isWindows && isChromiumBased) {
      this.chromeWindowsNoCache = true;
    }
  }

  getKey() {
    return this.url;
  }

  /**
   * Mutate the custom [Headers](https://developer.mozilla.org/en-US/docs/Web/API/Headers) set for all requests to the remote archive.
   */
  setHeaders(customHeaders: Headers) {
    this.customHeaders = customHeaders;
  }

  async getBytes(
    offset: number,
    length: number,
    passedSignal?: AbortSignal,
    etag?: string
  ): Promise<RangeResponse> {
    let controller: AbortController | undefined;
    let signal: AbortSignal | undefined;
    if (passedSignal) {
      signal = passedSignal;
    } else {
      controller = new AbortController();
      signal = controller.signal;
    }

    const requestHeaders = new Headers(this.customHeaders);
    requestHeaders.set("range", `bytes=${offset}-${offset + length - 1}`);

    // we don't send if match because:
    // * it disables browser caching completely (Chromium)
    // * it requires a preflight request for every tile request
    // * it requires CORS configuration becasue If-Match is not a CORs-safelisted header
    // CORs configuration should expose ETag.
    // if any etag mismatch is detected, we need to ignore the browser cache
    let cache: string | undefined;
    if (this.mustReload) {
      cache = "reload";
    } else if (this.chromeWindowsNoCache) {
      cache = "no-store";
    }

    let resp = await fetch(this.url, {
      signal: signal,
      cache: cache,
      headers: requestHeaders,
      //biome-ignore lint: "cache" is incompatible between cloudflare workers and browser
    } as any);

    // handle edge case where the archive is < 16384 kb total.
    if (offset === 0 && resp.status === 416) {
      const contentRange = resp.headers.get("Content-Range");
      if (!contentRange || !contentRange.startsWith("bytes */")) {
        throw Error("Missing content-length on 416 response");
      }
      const actualLength = +contentRange.substr(8);
      resp = await fetch(this.url, {
        signal: signal,
        cache: "reload",
        headers: { range: `bytes=0-${actualLength - 1}` },
        //biome-ignore lint: "cache" is incompatible between cloudflare workers and browser
      } as any);
    }

    // if it's a weak etag, it's not useful for us, so ignore it.
    let newEtag = resp.headers.get("Etag");
    if (newEtag?.startsWith("W/")) {
      newEtag = null;
    }

    // some storage systems are misbehaved (Cloudflare R2)
    if (resp.status === 416 || (etag && newEtag && newEtag !== etag)) {
      this.mustReload = true;
      throw new EtagMismatch(
        `Server returned non-matching ETag ${etag} after one retry. Check browser extensions and servers for issues that may affect correct ETag headers.`
      );
    }

    if (resp.status >= 300) {
      throw Error(`Bad response code: ${resp.status}`);
    }

    // some well-behaved backends, e.g. DigitalOcean CDN, respond with 200 instead of 206
    // but we also need to detect no support for Byte Serving which is returning the whole file
    const contentLength = resp.headers.get("Content-Length");
    if (resp.status === 200 && (!contentLength || +contentLength > length)) {
      if (controller) controller.abort();
      throw Error(
        "Server returned no content-length header or content-length exceeding request. Check that your storage backend supports HTTP Byte Serving."
      );
    }

    const a = await resp.arrayBuffer();
    return {
      data: a,
      etag: newEtag || undefined,
      cacheControl: resp.headers.get("Cache-Control") || undefined,
      expires: resp.headers.get("Expires") || undefined,
    };
  }
}

/** @hidden */
export function getUint64(v: DataView, offset: number): number {
  const wh = v.getUint32(offset + 4, true);
  const wl = v.getUint32(offset + 0, true);
  return wh * 2 ** 32 + wl;
}

/**
 * Parse raw header bytes into a Header object.
 */
export function bytesToHeader(bytes: ArrayBuffer, etag?: string): Header {
  const v = new DataView(bytes);
  const specVersion = v.getUint8(7);
  if (specVersion > 3) {
    throw Error(
      `Archive is spec version ${specVersion} but this library supports up to spec version 3`
    );
  }

  return {
    specVersion: specVersion,
    rootDirectoryOffset: getUint64(v, 8),
    rootDirectoryLength: getUint64(v, 16),
    jsonMetadataOffset: getUint64(v, 24),
    jsonMetadataLength: getUint64(v, 32),
    leafDirectoryOffset: getUint64(v, 40),
    leafDirectoryLength: getUint64(v, 48),
    tileDataOffset: getUint64(v, 56),
    tileDataLength: getUint64(v, 64),
    numAddressedTiles: getUint64(v, 72),
    numTileEntries: getUint64(v, 80),
    numTileContents: getUint64(v, 88),
    clustered: v.getUint8(96) === 1,
    internalCompression: v.getUint8(97),
    tileCompression: v.getUint8(98),
    tileType: v.getUint8(99),
    minZoom: v.getUint8(100),
    maxZoom: v.getUint8(101),
    minLon: v.getInt32(102, true) / 10000000,
    minLat: v.getInt32(106, true) / 10000000,
    maxLon: v.getInt32(110, true) / 10000000,
    maxLat: v.getInt32(114, true) / 10000000,
    centerZoom: v.getUint8(118),
    centerLon: v.getInt32(119, true) / 10000000,
    centerLat: v.getInt32(123, true) / 10000000,
    etag: etag,
  };
}

function deserializeIndex(buffer: ArrayBuffer): Entry[] {
  const p = { buf: new Uint8Array(buffer), pos: 0 };
  const numEntries = readVarint(p);

  const entries: Entry[] = [];

  let lastId = 0;
  for (let i = 0; i < numEntries; i++) {
    const v = readVarint(p);
    entries.push({ tileId: lastId + v, offset: 0, length: 0, runLength: 1 });
    lastId += v;
  }

  for (let i = 0; i < numEntries; i++) {
    entries[i].runLength = readVarint(p);
  }

  for (let i = 0; i < numEntries; i++) {
    entries[i].length = readVarint(p);
  }

  for (let i = 0; i < numEntries; i++) {
    const v = readVarint(p);
    if (v === 0 && i > 0) {
      entries[i].offset = entries[i - 1].offset + entries[i - 1].length;
    } else {
      entries[i].offset = v - 1;
    }
  }

  return entries;
}

function detectVersion(a: ArrayBuffer): number {
  const v = new DataView(a);
  if (v.getUint16(2, true) === 2) {
    console.warn(
      "PMTiles spec version 2 has been deprecated; please see github.com/protomaps/PMTiles for tools to upgrade"
    );
    return 2;
  }
  if (v.getUint16(2, true) === 1) {
    console.warn(
      "PMTiles spec version 1 has been deprecated; please see github.com/protomaps/PMTiles for tools to upgrade"
    );
    return 1;
  }
  return 3;
}

/**
 * Error thrown when a response for PMTiles over HTTP does not match previous, cached parts of the archive.
 * The default PMTiles implementation will catch this error once internally and retry a request.
 */
export class EtagMismatch extends Error {}

/**
 * Interface for caches of parts (headers, directories) of a PMTiles archive.
 */
export interface Cache {
  getHeader: (source: Source) => Promise<Header>;
  getDirectory: (
    source: Source,
    offset: number,
    length: number,
    header: Header
  ) => Promise<Entry[]>;
  getArrayBuffer: (
    source: Source,
    offset: number,
    length: number,
    header: Header
  ) => Promise<ArrayBuffer>;
  invalidate: (source: Source) => Promise<void>;
}

async function getHeaderAndRoot(
  source: Source,
  decompress: DecompressFunc
): Promise<[Header, [string, number, Entry[] | ArrayBuffer]?]> {
  const resp = await source.getBytes(0, 16384);

  const v = new DataView(resp.data);
  if (v.getUint16(0, true) !== 0x4d50) {
    throw new Error("Wrong magic number for PMTiles archive");
  }

  // V2 COMPATIBILITY
  if (detectVersion(resp.data) < 3) {
    return [await v2.getHeader(source)];
  }

  const headerData = resp.data.slice(0, HEADER_SIZE_BYTES);

  const header = bytesToHeader(headerData, resp.etag);

  // optimistically set the root directory
  // TODO check root bounds
  const rootDirData = resp.data.slice(
    header.rootDirectoryOffset,
    header.rootDirectoryOffset + header.rootDirectoryLength
  );
  const dirKey = `${source.getKey()}|${header.etag || ""}|${
    header.rootDirectoryOffset
  }|${header.rootDirectoryLength}`;

  const rootDir = deserializeIndex(
    await decompress(rootDirData, header.internalCompression)
  );
  return [header, [dirKey, rootDir.length, rootDir]];
}

async function getDirectory(
  source: Source,
  decompress: DecompressFunc,
  offset: number,
  length: number,
  header: Header
): Promise<Entry[]> {
  const resp = await source.getBytes(offset, length, undefined, header.etag);
  const data = await decompress(resp.data, header.internalCompression);
  const directory = deserializeIndex(data);
  if (directory.length === 0) {
    throw new Error("Empty directory is invalid");
  }

  return directory;
}

interface ResolvedValue {
  lastUsed: number;
  data: Header | Entry[] | ArrayBuffer;
}

/**
 * A cache for parts of a PMTiles archive where promises are never shared between requests.
 *
 * Runtimes such as Cloudflare Workers cannot share promises between different requests.
 *
 * Only caches headers and directories, not individual tile contents.
 */
export class ResolvedValueCache {
  cache: Map<string, ResolvedValue>;
  maxCacheEntries: number;
  counter: number;
  decompress: DecompressFunc;

  constructor(
    maxCacheEntries = 100,
    prefetch = true, // deprecated
    decompress: DecompressFunc = defaultDecompress
  ) {
    this.cache = new Map<string, ResolvedValue>();
    this.maxCacheEntries = maxCacheEntries;
    this.counter = 1;
    this.decompress = decompress;
  }

  async getHeader(source: Source): Promise<Header> {
    const cacheKey = source.getKey();
    const cacheValue = this.cache.get(cacheKey);
    if (cacheValue) {
      cacheValue.lastUsed = this.counter++;
      const data = cacheValue.data;
      return data as Header;
    }

    const res = await getHeaderAndRoot(source, this.decompress);
    if (res[1]) {
      this.cache.set(res[1][0], {
        lastUsed: this.counter++,
        data: res[1][2],
      });
    }

    this.cache.set(cacheKey, {
      lastUsed: this.counter++,
      data: res[0],
    });
    this.prune();
    return res[0];
  }

  async getDirectory(
    source: Source,
    offset: number,
    length: number,
    header: Header
  ): Promise<Entry[]> {
    const cacheKey = `${source.getKey()}|${
      header.etag || ""
    }|${offset}|${length}`;
    const cacheValue = this.cache.get(cacheKey);
    if (cacheValue) {
      cacheValue.lastUsed = this.counter++;
      const data = cacheValue.data;
      return data as Entry[];
    }

    const directory = await getDirectory(
      source,
      this.decompress,
      offset,
      length,
      header
    );
    this.cache.set(cacheKey, {
      lastUsed: this.counter++,
      data: directory,
    });
    this.prune();
    return directory;
  }

  // for v2 backwards compatibility
  async getArrayBuffer(
    source: Source,
    offset: number,
    length: number,
    header: Header
  ): Promise<ArrayBuffer> {
    const cacheKey = `${source.getKey()}|${
      header.etag || ""
    }|${offset}|${length}`;
    const cacheValue = this.cache.get(cacheKey);
    if (cacheValue) {
      cacheValue.lastUsed = this.counter++;
      const data = await cacheValue.data;
      return data as ArrayBuffer;
    }

    const resp = await source.getBytes(offset, length, undefined, header.etag);

    this.cache.set(cacheKey, {
      lastUsed: this.counter++,
      data: resp.data,
    });
    this.prune();
    return resp.data;
  }

  prune() {
    if (this.cache.size > this.maxCacheEntries) {
      let minUsed = Infinity;
      let minKey = undefined;
      this.cache.forEach((cacheValue: ResolvedValue, key: string) => {
        if (cacheValue.lastUsed < minUsed) {
          minUsed = cacheValue.lastUsed;
          minKey = key;
        }
      });
      if (minKey) {
        this.cache.delete(minKey);
      }
    }
  }

  async invalidate(source: Source) {
    this.cache.delete(source.getKey());
  }
}

interface SharedPromiseCacheValue {
  lastUsed: number;
  data: Promise<Header | Entry[] | ArrayBuffer>;
}

/**
 * A cache for parts of a PMTiles archive where promises can be shared between requests.
 *
 * Only caches headers and directories, not individual tile contents.
 */
export class SharedPromiseCache {
  cache: Map<string, SharedPromiseCacheValue>;
  invalidations: Map<string, Promise<void>>;
  maxCacheEntries: number;
  counter: number;
  decompress: DecompressFunc;

  constructor(
    maxCacheEntries = 100,
    prefetch = true, // deprecated
    decompress: DecompressFunc = defaultDecompress
  ) {
    this.cache = new Map<string, SharedPromiseCacheValue>();
    this.invalidations = new Map<string, Promise<void>>();
    this.maxCacheEntries = maxCacheEntries;
    this.counter = 1;
    this.decompress = decompress;
  }

  async getHeader(source: Source): Promise<Header> {
    const cacheKey = source.getKey();
    const cacheValue = this.cache.get(cacheKey);
    if (cacheValue) {
      cacheValue.lastUsed = this.counter++;
      const data = await cacheValue.data;
      return data as Header;
    }

    const p = new Promise<Header>((resolve, reject) => {
      getHeaderAndRoot(source, this.decompress)
        .then((res) => {
          if (res[1]) {
            this.cache.set(res[1][0], {
              lastUsed: this.counter++,
              data: Promise.resolve(res[1][2]),
            });
          }
          resolve(res[0]);
          this.prune();
        })
        .catch((e) => {
          reject(e);
        });
    });
    this.cache.set(cacheKey, { lastUsed: this.counter++, data: p });
    return p;
  }

  async getDirectory(
    source: Source,
    offset: number,
    length: number,
    header: Header
  ): Promise<Entry[]> {
    const cacheKey = `${source.getKey()}|${
      header.etag || ""
    }|${offset}|${length}`;
    const cacheValue = this.cache.get(cacheKey);
    if (cacheValue) {
      cacheValue.lastUsed = this.counter++;
      const data = await cacheValue.data;
      return data as Entry[];
    }

    const p = new Promise<Entry[]>((resolve, reject) => {
      getDirectory(source, this.decompress, offset, length, header)
        .then((directory) => {
          resolve(directory);
          this.prune();
        })
        .catch((e) => {
          reject(e);
        });
    });
    this.cache.set(cacheKey, { lastUsed: this.counter++, data: p });
    return p;
  }

  // for v2 backwards compatibility
  async getArrayBuffer(
    source: Source,
    offset: number,
    length: number,
    header: Header
  ): Promise<ArrayBuffer> {
    const cacheKey = `${source.getKey()}|${
      header.etag || ""
    }|${offset}|${length}`;
    const cacheValue = this.cache.get(cacheKey);
    if (cacheValue) {
      cacheValue.lastUsed = this.counter++;
      const data = await cacheValue.data;
      return data as ArrayBuffer;
    }

    const p = new Promise<ArrayBuffer>((resolve, reject) => {
      source
        .getBytes(offset, length, undefined, header.etag)
        .then((resp) => {
          resolve(resp.data);
          if (this.cache.has(cacheKey)) {
          }
          this.prune();
        })
        .catch((e) => {
          reject(e);
        });
    });
    this.cache.set(cacheKey, { lastUsed: this.counter++, data: p });
    return p;
  }

  prune() {
    if (this.cache.size >= this.maxCacheEntries) {
      let minUsed = Infinity;
      let minKey = undefined;
      this.cache.forEach((cacheValue: SharedPromiseCacheValue, key: string) => {
        if (cacheValue.lastUsed < minUsed) {
          minUsed = cacheValue.lastUsed;
          minKey = key;
        }
      });
      if (minKey) {
        this.cache.delete(minKey);
      }
    }
  }

  async invalidate(source: Source) {
    const key = source.getKey();
    if (this.invalidations.get(key)) {
      return await this.invalidations.get(key);
    }
    this.cache.delete(source.getKey());
    const p = new Promise<void>((resolve, reject) => {
      this.getHeader(source)
        .then((h) => {
          resolve();
          this.invalidations.delete(key);
        })
        .catch((e) => {
          reject(e);
        });
    });
    this.invalidations.set(key, p);
  }
}

/**
 * Main class encapsulating PMTiles decoding logic.
 *
 * if `source` is a string, creates a FetchSource using that string as the URL to a remote PMTiles.
 * if no `cache` is passed, use a SharedPromiseCache.
 * if no `decompress` is passed, default to the browser DecompressionStream API with a fallback to `fflate`.
 */
// biome-ignore lint: that's just how its capitalized
export class PMTiles {
  source: Source;
  cache: Cache;
  decompress: DecompressFunc;

  constructor(
    source: Source | string,
    cache?: Cache,
    decompress?: DecompressFunc
  ) {
    if (typeof source === "string") {
      this.source = new FetchSource(source);
    } else {
      this.source = source;
    }
    if (decompress) {
      this.decompress = decompress;
    } else {
      this.decompress = defaultDecompress;
    }
    if (cache) {
      this.cache = cache;
    } else {
      this.cache = new SharedPromiseCache();
    }
  }

  /**
   * Return the header of the archive,
   * including information such as tile type, min/max zoom, bounds, and summary statistics.
   */
  async getHeader() {
    return await this.cache.getHeader(this.source);
  }

  /** @hidden */
  async getZxyAttempt(
    z: number,
    x: number,
    y: number,
    signal?: AbortSignal
  ): Promise<RangeResponse | undefined> {
    const tileId = zxyToTileId(z, x, y);
    const header = await this.cache.getHeader(this.source);

    // V2 COMPATIBILITY
    if (header.specVersion < 3) {
      return v2.getZxy(header, this.source, this.cache, z, x, y, signal);
    }

    if (z < header.minZoom || z > header.maxZoom) {
      return undefined;
    }

    let dO = header.rootDirectoryOffset;
    let dL = header.rootDirectoryLength;
    for (let depth = 0; depth <= 3; depth++) {
      const directory = await this.cache.getDirectory(
        this.source,
        dO,
        dL,
        header
      );
      const entry = findTile(directory, tileId);
      if (entry) {
        if (entry.runLength > 0) {
          const resp = await this.source.getBytes(
            header.tileDataOffset + entry.offset,
            entry.length,
            signal,
            header.etag
          );
          return {
            data: await this.decompress(resp.data, header.tileCompression),
            cacheControl: resp.cacheControl,
            expires: resp.expires,
          };
        }
        dO = header.leafDirectoryOffset + entry.offset;
        dL = entry.length;
      } else {
        // TODO: We should in fact return a valid RangeResponse
        // with empty data, but filled in cache control / expires headers
        return undefined;
      }
    }
    throw Error("Maximum directory depth exceeded");
  }

  /**
   * Primary method to get a single tile's bytes from an archive.
   *
   * Returns undefined if the tile does not exist in the archive.
   */
  async getZxy(
    z: number,
    x: number,
    y: number,
    signal?: AbortSignal
  ): Promise<RangeResponse | undefined> {
    try {
      return await this.getZxyAttempt(z, x, y, signal);
    } catch (e) {
      if (e instanceof EtagMismatch) {
        this.cache.invalidate(this.source);
        return await this.getZxyAttempt(z, x, y, signal);
      }
      throw e;
    }
  }

  /** @hidden */
  async getMetadataAttempt(): Promise<unknown> {
    const header = await this.cache.getHeader(this.source);

    const resp = await this.source.getBytes(
      header.jsonMetadataOffset,
      header.jsonMetadataLength,
      undefined,
      header.etag
    );
    const decompressed = await this.decompress(
      resp.data,
      header.internalCompression
    );
    const dec = new TextDecoder("utf-8");
    return JSON.parse(dec.decode(decompressed));
  }

  /**
   * Return the arbitrary JSON metadata of the archive.
   */
  async getMetadata(): Promise<unknown> {
    try {
      return await this.getMetadataAttempt();
    } catch (e) {
      if (e instanceof EtagMismatch) {
        this.cache.invalidate(this.source);
        return await this.getMetadataAttempt();
      }
      throw e;
    }
  }

  /**
   * Construct a [TileJSON](https://github.com/mapbox/tilejson-spec) object.
   *
   * baseTilesUrl is the desired tiles URL, excluding the suffix `/{z}/{x}/{y}.{ext}`.
   * For example, if the desired URL is `http://example.com/tileset/{z}/{x}/{y}.mvt`,
   * the baseTilesUrl should be `https://example.com/tileset`.
   */
  async getTileJson(baseTilesUrl: string): Promise<unknown> {
    const header = await this.getHeader();
    const metadata = (await this.getMetadata()) as MetadataLike;
    const ext = tileTypeExt(header.tileType);

    return {
      tilejson: "3.0.0",
      scheme: "xyz",
      tiles: [`${baseTilesUrl}/{z}/{x}/{y}${ext}`],
      // biome-ignore lint: TileJSON spec
      vector_layers: metadata.vector_layers,
      attribution: metadata.attribution,
      description: metadata.description,
      name: metadata.name,
      version: metadata.version,
      bounds: [header.minLon, header.minLat, header.maxLon, header.maxLat],
      center: [header.centerLon, header.centerLat, header.centerZoom],
      minzoom: header.minZoom,
      maxzoom: header.maxZoom,
    };
  }
}
