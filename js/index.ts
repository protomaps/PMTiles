declare const L: any;

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

interface Header {
  version: number;
  json_size: number;
  root_entries: number;
}

interface Root {
  header: Header;
  dir: DataView;
  view: DataView;
}

export interface Entry {
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
): Entry | null => {
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

export const queryLeafLevel = (view: DataView): number | null => {
  if (view.byteLength < 17) return null;
  const numEntries = view.byteLength / 17;
  const entry = parseEntry(view, numEntries - 1);
  if (entry.is_dir) return entry.z;
  return null;
};

const entrySort = (a: Entry, b: Entry): number => {
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

export const parseEntry = (dataview: DataView, i: number): Entry => {
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

export const sortDir = (dataview: DataView): DataView => {
  const entries: Entry[] = [];
  for (let i = 0; i < dataview.byteLength / 17; i++) {
    entries.push(parseEntry(dataview, i));
  }
  return createDirectory(entries);
};

export const createDirectory = (entries: Entry[]): DataView => {
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
  return new DataView(arr.buffer, arr.byteOffset, arr.length);
};

export const deriveLeaf = (root: Root, tile: Zxy): Zxy | null => {
  const leaf_level = queryLeafLevel(root.dir);
  if (leaf_level) {
    const level_diff = tile.z - leaf_level;
    const leaf_x = Math.trunc(tile.x / (1 << level_diff));
    const leaf_y = Math.trunc(tile.y / (1 << level_diff));
    return { z: leaf_level, x: leaf_x, y: leaf_y };
  }
  return null;
};

export const parseHeader = (dataview: DataView): Header => {
  const magic = dataview.getUint16(0, true);
  if (magic !== 19792) {
    throw new Error('File header does not begin with "PM"');
  }
  const version = dataview.getUint16(2, true);
  const json_size = dataview.getUint32(4, true);
  const root_entries = dataview.getUint16(8, true);
  return {
    version: version,
    json_size: json_size,
    root_entries: root_entries,
  };
};

export interface Source {
  getBytes: (offset: number, length: number) => Promise<DataView>;
  getKey: () => string;
}

export class FileSource implements Source {
  file: File;

  constructor(file: File) {
    this.file = file;
  }

  getKey() {
    return this.file.name;
  }

  async getBytes(offset: number, length: number) {
    let blob = this.file.slice(offset, offset + length);
    let a = await blob.arrayBuffer();
    return new DataView(a);
  }
}

export class FetchSource implements Source {
  url: string;

  constructor(url: string) {
    this.url = url;
  }

  getKey() {
    return this.url;
  }

  async getBytes(offset: number, length: number) {
    const controller = new AbortController();
    const signal = controller.signal;
    const resp = await fetch(this.url, {
      signal: signal,
      headers: { Range: "bytes=" + offset + "-" + (offset + length - 1) },
    });
    const contentLength = resp.headers.get("Content-Length");
    if (!contentLength || +contentLength !== length) {
      console.error(
        "Content-Length mismatch indicates byte serving not supported; aborting."
      );
      controller.abort();
    }

    const a = await resp.arrayBuffer();
    return new DataView(a);
  }
}

interface CacheEntry {
  lastUsed: number;
  buffer: Promise<DataView>;
}

export class LRUCacheSource implements Source {
  entries: Map<number, CacheEntry>;
  maxEntries: number;
  source: Source;

  constructor(source: Source, maxEntries: number) {
    this.source = source;
    this.entries = new Map<number, CacheEntry>();
    this.maxEntries = maxEntries;
  }

  getKey = () => {
    return this.source.getKey();
  };

  async getBytes(offset: number, length: number) {
    let val = this.entries.get(offset);
    if (val) {
      val.lastUsed = performance.now();
      return val.buffer;
    }

    let promise = this.source.getBytes(offset, length);

    this.entries.set(offset, {
      lastUsed: performance.now(),
      buffer: promise,
    });

    if (this.entries.size > this.maxEntries) {
      let minUsed = Infinity;
      let minKey = undefined;
      this.entries.forEach((val, key) => {
        if (val.lastUsed < minUsed) {
          minUsed = val.lastUsed;
          minKey = key;
        }
      });
      if (minKey) this.entries.delete(minKey);
    }

    return promise;
  }
}

export class PMTiles {
  source: Source;

  constructor(source: string | Source, maxLeaves = 64) {
    if (typeof source === "string") {
      this.source = new LRUCacheSource(new FetchSource(source), maxLeaves);
    } else {
      this.source = source;
    }
  }

  async fetchRoot(): Promise<Root> {
    const v = await this.source.getBytes(0, 512000);
    const header = parseHeader(new DataView(v.buffer, v.byteOffset, 10));

    let root_dir = new DataView(
      v.buffer,
      10 + header.json_size,
      17 * header.root_entries
    );
    if (header.version === 1) {
      console.warn("Sorting pmtiles v1 directory");
      root_dir = sortDir(root_dir);
    }

    return {
      header: header,
      view: v,
      dir: root_dir,
    };
  }

  async root_entries(): Promise<Entry[]> {
    const root = await this.fetchRoot();
    let entries = [];
    for (var i = 0; i < root.header.root_entries; i++) {
      entries.push(parseEntry(root.dir,i));
    }
    return entries;
  }

  async metadata(): Promise<any> {
    const root = await this.fetchRoot();
    const dec = new TextDecoder("utf-8");
    const result = JSON.parse(
      dec.decode(
        new DataView(
          root.view.buffer,
          root.view.byteOffset + 10,
          root.header.json_size
        )
      )
    );
    if (result.compression) {
      console.warn(
        `Archive has compression type: ${result.compression} and may not be readable directly by browsers.`
      );
    }
    if (!result.bounds) {
      console.warn(
        `Archive is missing 'bounds' in metadata, required in v2 and above.`
      );
    }
    if (!result.minzoom) {
      console.warn(
        `Archive is missing 'minzoom' in metadata, required in v2 and above.`
      );
    }
    if (!result.maxzoom) {
      console.warn(
        `Archive is missing 'maxzoom' in metadata, required in v2 and above.`
      );
    }
    return result;
  }

  async fetchLeafdir(version: number, entry: Entry): Promise<DataView> {
    let buf = await this.source.getBytes(entry.offset, entry.length);

    if (version === 1) {
      console.warn("Sorting pmtiles v1 directory.");
      buf = sortDir(buf);
    }

    return buf;
  }

  async getLeafdir(version: number, entry: Entry): Promise<DataView> {
    return this.fetchLeafdir(version, entry);
  }

  async getZxy(z: number, x: number, y: number): Promise<Entry | null> {
    const root = await this.fetchRoot();
    const entry = queryTile(
      new DataView(root.dir.buffer, root.dir.byteOffset, root.dir.byteLength),
      z,
      x,
      y
    );
    if (entry) return entry;

    const leafcoords = deriveLeaf(root, { z: z, x: x, y: y });
    if (leafcoords) {
      const leafdir_entry = queryLeafdir(
        new DataView(root.dir.buffer, root.dir.byteOffset, root.dir.byteLength),
        leafcoords.z,
        leafcoords.x,
        leafcoords.y
      );
      if (leafdir_entry) {
        const leafdir = await this.getLeafdir(
          root.header.version,
          leafdir_entry
        );
        return queryTile(
          new DataView(leafdir.buffer, leafdir.byteOffset, leafdir.byteLength),
          z,
          x,
          y
        );
      }
    }
    return null;
  }
}

export const leafletLayer = (source: PMTiles, options: any) => {
  const cls = L.GridLayer.extend({
    createTile: function (coord: any, done: any) {
      const tile: any = document.createElement("img");
      source.getZxy(coord.z, coord.x, coord.y).then((result) => {
        if (result === null) return;

        const controller = new AbortController();
        const signal = controller.signal;
        tile.cancel = () => {
          controller.abort();
        };

        source.source
          .getBytes(result.offset, result.length)
          .then((buf) => {
            const blob = new Blob([buf], { type: "image/png" });
            const imageUrl = window.URL.createObjectURL(blob);
            tile.src = imageUrl;
            tile.cancel = null;
            done(null, tile);
          })
          .catch((error) => {
            if (error.name !== "AbortError") throw error;
          });
      });
      return tile;
    },

    _removeTile: function (key: string) {
      const tile = this._tiles[key];
      if (!tile) {
        return;
      }

      if (tile.el.cancel) tile.el.cancel();

      tile.el.width = 0;
      tile.el.height = 0;
      tile.el.deleted = true;
      L.DomUtil.remove(tile.el);
      delete this._tiles[key];
      this.fire("tileunload", {
        tile: tile.el,
        coords: this._keyToTileCoords(key),
      });
    },
  });
  return new cls(options);
};

export class ProtocolCache {
  tiles: Map<string, PMTiles>;

  constructor() {
    this.tiles = new Map<string, PMTiles>();
  }

  add(p: PMTiles) {
    this.tiles.set(p.source.getKey(), p);
  }

  get(url: string) {
    return this.tiles.get(url);
  }

  protocol = (params: any, callback: any) => {
    const re = new RegExp(/pmtiles:\/\/(.+)\/(\d+)\/(\d+)\/(\d+)/);
    const result = params.url.match(re);
    const pmtiles_url = result[1];

    let instance = this.tiles.get(pmtiles_url);
    if (!instance) {
      instance = new PMTiles(pmtiles_url);
      this.tiles.set(pmtiles_url, instance);
    }
    const z = result[2];
    const x = result[3];
    const y = result[4];
    let cancel = () => {};

    instance.getZxy(+z, +x, +y).then((val) => {
      if (val) {
        instance!.source
          .getBytes(val.offset, val.length)
          .then((arr) => {
            callback(null, arr, null, null);
          })
          .catch((e) => {
            callback(new Error("Canceled"), null, null, null);
          });
      } else {
        callback(null, new Uint8Array(), null, null);
      }
    });
    return {
      cancel: () => {
        cancel();
      },
    };
  };
}
