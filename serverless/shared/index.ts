import { Header, TileType } from "../../js/index";

export const pmtiles_path = (name: string, setting?: string): string => {
  if (setting) {
    return setting.replaceAll("{name}", name);
  }
  return name + ".pmtiles";
};

const TILE =
  /^\/(?<NAME>[0-9a-zA-Z\/!\-_\.\*\'\(\)]+)\/(?<Z>\d+)\/(?<X>\d+)\/(?<Y>\d+).(?<EXT>[a-z]+)$/;

const TILESET = /^\/(?<NAME>[0-9a-zA-Z\/!\-_\.\*\'\(\)]+).json$/;

export const tile_path = (
  path: string
): {
  ok: boolean;
  name: string;
  tile?: [number, number, number];
  ext: string;
} => {
  const tile_match = path.match(TILE);

  if (tile_match) {
    const g = tile_match.groups!;
    return { ok: true, name: g.NAME, tile: [+g.Z, +g.X, +g.Y], ext: g.EXT };
  }

  const tileset_match = path.match(TILESET);

  if (tileset_match) {
    const g = tileset_match.groups!;
    return { ok: true, name: g.NAME, ext: "json" };
  }

  return { ok: false, name: "", tile: [0, 0, 0], ext: "" };
};

export const tileJSON = (
  header: Header,
  metadata: any,
  hostname: string,
  tileset_name: string
) => {
  let ext = "";
  if (header.tileType === TileType.Mvt) {
    ext = ".mvt";
  } else if (header.tileType === TileType.Png) {
    ext = ".png";
  } else if (header.tileType === TileType.Jpeg) {
    ext = ".jpg";
  } else if (header.tileType === TileType.Webp) {
    ext = ".webp";
  } else if (header.tileType === TileType.Avif) {
    ext = ".avif";
  }

  return {
    tilejson: "3.0.0",
    scheme: "xyz",
    tiles: ["https://" + hostname + "/" + tileset_name + "/{z}/{x}/{y}" + ext],
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
};
