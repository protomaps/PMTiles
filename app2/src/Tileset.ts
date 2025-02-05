// a TileJSON or a .pmtiles archive, local or remote
// gets metadata, tiles, etc

export class Tileset {
  url: string;

  constructor(url: string) {
    this.url = url;
  }
}
