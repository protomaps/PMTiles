// a TileJSON or a .pmtiles archive, local or remote
// gets metadata, tiles, etc

import { FileSource, PMTiles, TileType } from "pmtiles";

interface VectorLayer {
  id: string;
}

interface Metadata {
  type?: string;
  vector_layers: VectorLayer[];
}

export interface Tileset {
  getZxy(z: number, x: number, y: number): Promise<ArrayBuffer | undefined>;
  getMetadata(): Promise<Metadata>;
  getStateUrl(): string | undefined;
  getLocalFileName(): string;
  getMaplibreSourceUrl(): string;
  getBounds(): Promise<[number, number, number, number]>;
  getMaxZoom(): Promise<number>;

  getVectorLayers(): Promise<string[]>;
  isOverlay(): Promise<boolean>;
  isVector(): Promise<boolean>;

  test(): Promise<void>;

  archiveForProtocol(): PMTiles | undefined;
}

export class PMTilesTileset {
  archive: PMTiles;

  constructor(p: PMTiles) {
    this.archive = p;
  }

  async getZxy(z: number, x: number, y: number) {
    const resp = await this.archive.getZxy(z, x, y);
    if (resp) return resp.data;
  }

  async getBounds(): Promise<[number, number, number, number]> {
    const h = await this.getHeader();
    return [h.minLon, h.minLat, h.maxLon, h.maxLat];
  }

  async getMaxZoom(): Promise<number> {
    const h = await this.getHeader();
    return h.maxZoom;
  }

  async isVector() {
    const h = await this.getHeader();
    return h.tileType === TileType.Mvt;
  }

  async getHeader() {
    return await this.archive.getHeader();
  }

  async test() {
    await this.archive.getHeader();
  }

  async getMetadata() {
    return (await this.archive.getMetadata()) as Metadata;
  }

  async isOverlay() {
    const m = await this.getMetadata();
    return m.type === "overlay";
  }

  async getVectorLayers() {
    const m = await this.getMetadata();
    return m.vector_layers.map((l) => l.id);
  }
}

class RemotePMTilesTileset extends PMTilesTileset implements Tileset {
  url: string;

  constructor(url: string) {
    super(new PMTiles(url));
    this.url = url;
  }

  getStateUrl() {
    return this.url;
  }

  getLocalFileName() {
    return "";
  }

  getMaplibreSourceUrl() {
    return `pmtiles://${this.url}`;
  }

  archiveForProtocol() {
    return undefined;
  }
}

class LocalPMTilesTileset extends PMTilesTileset implements Tileset {
  name: string;

  constructor(file: File) {
    super(new PMTiles(new FileSource(file)));
    this.name = file.name;
  }

  // the local file cannot be persisted in the URL.
  getStateUrl() {
    return undefined;
  }

  getLocalFileName() {
    return this.name;
  }

  getMaplibreSourceUrl() {
    return `pmtiles://${this.name}`;
  }

  archiveForProtocol() {
    return this.archive;
  }
}

class TileJSONTileset implements Tileset {
  url: string;

  constructor(url: string) {
    this.url = url;
  }

  archiveForProtocol() {
    return undefined;
  }

  async test() {
    await fetch(this.url);
  }

  async getBounds() {
    const resp = await fetch(this.url);
    const j = await resp.json();
    return j.bounds as [number, number, number, number];
  }

  async getMaxZoom() {
    const resp = await fetch(this.url);
    const j = await resp.json();
    return j.maxzoom;
  }

  getMaplibreSourceUrl() {
    return this.url;
  }

  async isOverlay() {
    return true;
  }

  async isVector() {
    const resp = await fetch(this.url);
    const j = await resp.json();
    const template = j.tiles[0];
    const pathname = new URL(template).pathname;
    return pathname.endsWith(".pbf") || pathname.endsWith(".mvt");
  }

  getStateUrl() {
    return this.url;
  }

  getLocalFileName() {
    return "";
  }

  async getZxy(z: number, x: number, y: number) {
    const resp = await fetch(this.url);
    const j = await resp.json();
    const template = j.tiles[0];
    const tileURL = template
      .replace("{z}", z)
      .replace("{x}", x)
      .replace("{y}", y);
    const tileResp = await fetch(tileURL);
    return await tileResp.arrayBuffer();
  }

  async getMetadata() {
    const resp = await fetch(this.url);
    return await resp.json();
  }

  async getVectorLayers() {
    const metadata = await this.getMetadata();
    return metadata.vector_layers.map((l: VectorLayer) => l.id);
  }
}

// from a input box or a URL param state.
export const tilesetFromString = (url: string): Tileset => {
  const parsed = new URL(url);
  if (parsed.pathname.endsWith(".json")) {
    return new TileJSONTileset(url);
  }
  return new RemotePMTilesTileset(url);
};

export const tilesetFromFile = (file: File): Tileset => {
  return new LocalPMTilesTileset(file);
};
