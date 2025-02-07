// a TileJSON or a .pmtiles archive, local or remote
// gets metadata, tiles, etc

import { PMTiles } from "pmtiles";

interface Tileset {
  getZxy (z: number, x: number, y:number): Promise<ArrayBuffer>;
  getMetadata (): Promise<unknown>;
}

export class Tileset {
  url: string;

  constructor(url: string) {
    this.url = url;
  }
}
