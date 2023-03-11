import {
  Source,
  Header,
  Cache,
  RangeResponse,
  Compression,
  TileType,
} from "./index";
import { decompressSync } from "fflate";

export const shift = (n: number, shift: number) => {
  return n * Math.pow(2, shift);
};

export const unshift = (n: number, shift: number) => {
  return Math.floor(n / Math.pow(2, shift));
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
  is_dir: boolean;
}

const compare = (
  tz: number,
  tx: number,
  ty: number,
  view: DataView,
  i: number
) => {
  if (tz != view.getUint8(i)) return tz - view.getUint8(i);
  const x = getUint24(view, i + 1);
  if (tx != x) return tx - x;
  const y = getUint24(view, i + 4);
  if (ty != y) return ty - y;
  return 0;
};

export const queryLeafdir = (
  view: DataView,
  z: number,
  x: number,
  y: number
): EntryV2 | null => {
  const offset_len = queryView(view, z | 0x80, x, y);
  if (offset_len) {
    return {
      z: z,
      x: x,
      y: y,
      offset: offset_len[0],
      length: offset_len[1],
      is_dir: true,
    };
  }
  return null;
};

export const queryTile = (view: DataView, z: number, x: number, y: number) => {
  const offset_len = queryView(view, z, x, y);
  if (offset_len) {
    return {
      z: z,
      x: x,
      y: y,
      offset: offset_len[0],
      length: offset_len[1],
      is_dir: false,
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
  if (a.is_dir && !b.is_dir) {
    return 1;
  }
  if (!a.is_dir && b.is_dir) {
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
  const z_raw = dataview.getUint8(i * 17);
  const z = z_raw & 127;
  return {
    z: z,
    x: getUint24(dataview, i * 17 + 1),
    y: getUint24(dataview, i * 17 + 4),
    offset: getUint48(dataview, i * 17 + 7),
    length: dataview.getUint32(i * 17 + 13, true),
    is_dir: z_raw >> 7 === 1,
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
    if (entry.is_dir) z = z | 0x80;
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
  if (entry.is_dir) {
    const leaf_level = entry.z;
    const level_diff = tile.z - leaf_level;
    const leaf_x = Math.trunc(tile.x / (1 << level_diff));
    const leaf_y = Math.trunc(tile.y / (1 << level_diff));
    return { z: leaf_level, x: leaf_x, y: leaf_y };
  }
  return null;
};

async function getHeader(source: Source): Promise<Header> {
  const resp = await source.getBytes(0, 512000);

  const dataview = new DataView(resp.data);

  const json_size = dataview.getUint32(4, true);
  const root_entries = dataview.getUint16(8, true);

  const dec = new TextDecoder("utf-8");
  const json_metadata = JSON.parse(
    dec.decode(new DataView(resp.data, 10, json_size))
  );
  let tile_compression = Compression.Unknown;
  if (json_metadata.compression === "gzip") {
    tile_compression = Compression.Gzip;
  }

  let minzoom = 0;
  if ("minzoom" in json_metadata) {
    minzoom = +json_metadata.minzoom;
  }

  let maxzoom = 0;
  if ("maxzoom" in json_metadata) {
    maxzoom = +json_metadata.maxzoom;
  }

  let center_lon = 0;
  let center_lat = 0;
  let center_zoom = 0;
  let min_lon = -180.0;
  let min_lat = -85.0;
  let max_lon = 180.0;
  let max_lat = 85.0;

  if (json_metadata.bounds) {
    const split = json_metadata.bounds.split(",");
    min_lon = +split[0];
    min_lat = +split[1];
    max_lon = +split[2];
    max_lat = +split[3];
  }

  if (json_metadata.center) {
    const split = json_metadata.center.split(",");
    center_lon = +split[0];
    center_lat = +split[1];
    center_zoom = +split[2];
  }

  const header = {
    specVersion: dataview.getUint16(2, true),
    rootDirectoryOffset: 10 + json_size,
    rootDirectoryLength: root_entries * 17,
    jsonMetadataOffset: 10,
    jsonMetadataLength: json_size,
    leafDirectoryOffset: 0,
    leafDirectoryLength: undefined,
    tileDataOffset: 0,
    tileDataLength: undefined,
    numAddressedTiles: 0,
    numTileEntries: 0,
    numTileContents: 0,
    clustered: false,
    internalCompression: Compression.None,
    tileCompression: tile_compression,
    tileType: TileType.Mvt,
    minZoom: minzoom,
    maxZoom: maxzoom,
    minLon: min_lon,
    minLat: min_lat,
    maxLon: max_lon,
    maxLat: max_lat,
    centerZoom: center_zoom,
    centerLon: center_lon,
    centerLat: center_lat,
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
  let root_dir = await cache.getArrayBuffer(
    source,
    header.rootDirectoryOffset,
    header.rootDirectoryLength,
    header
  );
  if (header.specVersion === 1) {
    root_dir = sortDir(root_dir);
  }

  const entry = queryTile(new DataView(root_dir), z, x, y);
  if (entry) {
    const resp = await source.getBytes(entry.offset, entry.length, signal);
    let tile_data = resp.data;

    const view = new DataView(tile_data);
    if (view.getUint8(0) == 0x1f && view.getUint8(1) == 0x8b) {
      tile_data = decompressSync(new Uint8Array(tile_data));
    }

    return {
      data: tile_data,
    };
  }
  const leafcoords = deriveLeaf(new DataView(root_dir), { z: z, x: x, y: y });

  if (leafcoords) {
    const leafdir_entry = queryLeafdir(
      new DataView(root_dir),
      leafcoords.z,
      leafcoords.x,
      leafcoords.y
    );
    if (leafdir_entry) {
      let leaf_dir = await cache.getArrayBuffer(
        source,
        leafdir_entry.offset,
        leafdir_entry.length,
        header
      );

      if (header.specVersion === 1) {
        leaf_dir = sortDir(leaf_dir);
      }
      const tile_entry = queryTile(new DataView(leaf_dir), z, x, y);
      if (tile_entry) {
        const resp = await source.getBytes(
          tile_entry.offset,
          tile_entry.length,
          signal
        );
        let tile_data = resp.data;

        const view = new DataView(tile_data);
        if (view.getUint8(0) == 0x1f && view.getUint8(1) == 0x8b) {
          tile_data = decompressSync(new Uint8Array(tile_data));
        }
        return {
          data: tile_data,
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
