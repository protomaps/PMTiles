import { decompressSync } from "fflate";
import {
  Cache,
  Compression,
  Header,
  RangeResponse,
  Source,
  TileType,
} from "./index";

export const shift = (n: number, shift: number) => {
  return n * 2 ** shift;
};

export const unshift = (n: number, shift: number) => {
  return Math.floor(n / 2 ** shift);
};

export const getUint24 = (view: DataView, pos: number) => {
  return shift(view.getUint16(pos + 1, true), 8) + view.getUint8(pos);
};

export const getUint48 = (view: DataView, pos: number) => {
  return shift(view.getUint32(pos + 2, true), 16) + view.getUint16(pos, true);
};

interface Zxy {
  z: number;
  x: number;
  y: number;
}

export interface EntryV2 {
  z: number;
  x: number;
  y: number;
  offset: number;
  length: number;
  isDir: boolean;
}

const compare = (
  tz: number,
  tx: number,
  ty: number,
  view: DataView,
  i: number
) => {
  if (tz !== view.getUint8(i)) return tz - view.getUint8(i);
  const x = getUint24(view, i + 1);
  if (tx !== x) return tx - x;
  const y = getUint24(view, i + 4);
  if (ty !== y) return ty - y;
  return 0;
};

export const queryLeafdir = (
  view: DataView,
  z: number,
  x: number,
  y: number
): EntryV2 | null => {
  const offsetLen = queryView(view, z | 0x80, x, y);
  if (offsetLen) {
    return {
      z: z,
      x: x,
      y: y,
      offset: offsetLen[0],
      length: offsetLen[1],
      isDir: true,
    };
  }
  return null;
};

export const queryTile = (view: DataView, z: number, x: number, y: number) => {
  const offsetLen = queryView(view, z, x, y);
  if (offsetLen) {
    return {
      z: z,
      x: x,
      y: y,
      offset: offsetLen[0],
      length: offsetLen[1],
      isDir: false,
    };
  }
  return null;
};

const queryView = (
  view: DataView,
  z: number,
  x: number,
  y: number
): [number, number] | null => {
  let m = 0;
  let n = view.byteLength / 17 - 1;
  while (m <= n) {
    const k = (n + m) >> 1;
    const cmp = compare(z, x, y, view, k * 17);
    if (cmp > 0) {
      m = k + 1;
    } else if (cmp < 0) {
      n = k - 1;
    } else {
      return [getUint48(view, k * 17 + 7), view.getUint32(k * 17 + 13, true)];
    }
  }
  return null;
};

const entrySort = (a: EntryV2, b: EntryV2): number => {
  if (a.isDir && !b.isDir) {
    return 1;
  }
  if (!a.isDir && b.isDir) {
    return -1;
  }
  if (a.z !== b.z) {
    return a.z - b.z;
  }
  if (a.x !== b.x) {
    return a.x - b.x;
  }
  return a.y - b.y;
};

export const parseEntry = (dataview: DataView, i: number): EntryV2 => {
  const zRaw = dataview.getUint8(i * 17);
  const z = zRaw & 127;
  return {
    z: z,
    x: getUint24(dataview, i * 17 + 1),
    y: getUint24(dataview, i * 17 + 4),
    offset: getUint48(dataview, i * 17 + 7),
    length: dataview.getUint32(i * 17 + 13, true),
    isDir: zRaw >> 7 === 1,
  };
};

export const sortDir = (a: ArrayBuffer): ArrayBuffer => {
  const entries: EntryV2[] = [];
  const view = new DataView(a);
  for (let i = 0; i < view.byteLength / 17; i++) {
    entries.push(parseEntry(view, i));
  }
  return createDirectory(entries);
};

export const createDirectory = (entries: EntryV2[]): ArrayBuffer => {
  entries.sort(entrySort);

  const buffer = new ArrayBuffer(17 * entries.length);
  const arr = new Uint8Array(buffer);
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    let z = entry.z;
    if (entry.isDir) z = z | 0x80;
    arr[i * 17] = z;

    arr[i * 17 + 1] = entry.x & 0xff;
    arr[i * 17 + 2] = (entry.x >> 8) & 0xff;
    arr[i * 17 + 3] = (entry.x >> 16) & 0xff;

    arr[i * 17 + 4] = entry.y & 0xff;
    arr[i * 17 + 5] = (entry.y >> 8) & 0xff;
    arr[i * 17 + 6] = (entry.y >> 16) & 0xff;

    arr[i * 17 + 7] = entry.offset & 0xff;
    arr[i * 17 + 8] = unshift(entry.offset, 8) & 0xff;
    arr[i * 17 + 9] = unshift(entry.offset, 16) & 0xff;
    arr[i * 17 + 10] = unshift(entry.offset, 24) & 0xff;
    arr[i * 17 + 11] = unshift(entry.offset, 32) & 0xff;
    arr[i * 17 + 12] = unshift(entry.offset, 48) & 0xff;

    arr[i * 17 + 13] = entry.length & 0xff;
    arr[i * 17 + 14] = (entry.length >> 8) & 0xff;
    arr[i * 17 + 15] = (entry.length >> 16) & 0xff;
    arr[i * 17 + 16] = (entry.length >> 24) & 0xff;
  }
  return buffer;
};

export const deriveLeaf = (view: DataView, tile: Zxy): Zxy | null => {
  if (view.byteLength < 17) return null;
  const numEntries = view.byteLength / 17;
  const entry = parseEntry(view, numEntries - 1);
  if (entry.isDir) {
    const leafLevel = entry.z;
    const levelDiff = tile.z - leafLevel;
    const leafX = Math.trunc(tile.x / (1 << levelDiff));
    const leafY = Math.trunc(tile.y / (1 << levelDiff));
    return { z: leafLevel, x: leafX, y: leafY };
  }
  return null;
};

async function getHeader(source: Source): Promise<Header> {
  const resp = await source.getBytes(0, 512000);

  const dataview = new DataView(resp.data);

  const jsonSize = dataview.getUint32(4, true);
  const rootEntries = dataview.getUint16(8, true);

  const dec = new TextDecoder("utf-8");
  const jsonMetadata = JSON.parse(
    dec.decode(new DataView(resp.data, 10, jsonSize))
  );
  let tileCompression = Compression.Unknown;
  if (jsonMetadata.compression === "gzip") {
    tileCompression = Compression.Gzip;
  }

  let minzoom = 0;
  if ("minzoom" in jsonMetadata) {
    minzoom = +jsonMetadata.minzoom;
  }

  let maxzoom = 0;
  if ("maxzoom" in jsonMetadata) {
    maxzoom = +jsonMetadata.maxzoom;
  }

  let centerLon = 0;
  let centerLat = 0;
  let centerZoom = 0;
  let minLon = -180.0;
  let minLat = -85.0;
  let maxLon = 180.0;
  let maxLat = 85.0;

  if (jsonMetadata.bounds) {
    const split = jsonMetadata.bounds.split(",");
    minLon = +split[0];
    minLat = +split[1];
    maxLon = +split[2];
    maxLat = +split[3];
  }

  if (jsonMetadata.center) {
    const split = jsonMetadata.center.split(",");
    centerLon = +split[0];
    centerLat = +split[1];
    centerZoom = +split[2];
  }

  const header = {
    specVersion: dataview.getUint16(2, true),
    rootDirectoryOffset: 10 + jsonSize,
    rootDirectoryLength: rootEntries * 17,
    jsonMetadataOffset: 10,
    jsonMetadataLength: jsonSize,
    leafDirectoryOffset: 0,
    leafDirectoryLength: undefined,
    tileDataOffset: 0,
    tileDataLength: undefined,
    numAddressedTiles: 0,
    numTileEntries: 0,
    numTileContents: 0,
    clustered: false,
    internalCompression: Compression.None,
    tileCompression: tileCompression,
    tileType: TileType.Mvt,
    minZoom: minzoom,
    maxZoom: maxzoom,
    minLon: minLon,
    minLat: minLat,
    maxLon: maxLon,
    maxLat: maxLat,
    centerZoom: centerZoom,
    centerLon: centerLon,
    centerLat: centerLat,
    etag: resp.etag,
  };
  return header;
}

async function getZxy(
  header: Header,
  source: Source,
  cache: Cache,
  z: number,
  x: number,
  y: number,
  signal?: AbortSignal
): Promise<RangeResponse | undefined> {
  let rootDir = await cache.getArrayBuffer(
    source,
    header.rootDirectoryOffset,
    header.rootDirectoryLength,
    header
  );
  if (header.specVersion === 1) {
    rootDir = sortDir(rootDir);
  }

  const entry = queryTile(new DataView(rootDir), z, x, y);
  if (entry) {
    const resp = await source.getBytes(entry.offset, entry.length, signal);
    let tileData = resp.data;

    const view = new DataView(tileData);
    if (view.getUint8(0) === 0x1f && view.getUint8(1) === 0x8b) {
      tileData = decompressSync(new Uint8Array(tileData));
    }

    return {
      data: tileData,
    };
  }
  const leafcoords = deriveLeaf(new DataView(rootDir), { z: z, x: x, y: y });

  if (leafcoords) {
    const leafdirEntry = queryLeafdir(
      new DataView(rootDir),
      leafcoords.z,
      leafcoords.x,
      leafcoords.y
    );
    if (leafdirEntry) {
      let leafDir = await cache.getArrayBuffer(
        source,
        leafdirEntry.offset,
        leafdirEntry.length,
        header
      );

      if (header.specVersion === 1) {
        leafDir = sortDir(leafDir);
      }
      const tileEntry = queryTile(new DataView(leafDir), z, x, y);
      if (tileEntry) {
        const resp = await source.getBytes(
          tileEntry.offset,
          tileEntry.length,
          signal
        );
        let tileData = resp.data;

        const view = new DataView(tileData);
        if (view.getUint8(0) === 0x1f && view.getUint8(1) === 0x8b) {
          tileData = decompressSync(new Uint8Array(tileData));
        }
        return {
          data: tileData,
        };
      }
    }
  }

  return undefined;
}

export default {
  getHeader: getHeader,
  getZxy: getZxy,
};
