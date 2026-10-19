export const pmtiles_path = (name: string, setting?: string): string => {
  if (setting) {
    return setting.replaceAll("{name}", name);
  }
  return name + ".pmtiles";
};

const TILE =
  /^\/(?<NAME>.+)\/(?<Z>\d+)\/(?<X>\d+)\/(?<Y>\d+).(?<EXT>[a-z]+)$/;

const TILESET = /^\/(?<NAME>.+).json$/;

// Percent-decodes the name from the URL path, returning undefined if the
// encoding is malformed or the result is not a safe object key.
const decode_name = (raw: string): string | undefined => {
  let name: string;
  try {
    name = decodeURIComponent(raw);
  } catch {
    return undefined;
  }
  if (!name || /[\\\p{Cc}]/u.test(name) || name.split("/").includes("..")) {
    return undefined;
  }
  return name;
};

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
    const name = decode_name(g.NAME);
    if (name !== undefined) {
      return { ok: true, name, tile: [+g.Z, +g.X, +g.Y], ext: g.EXT };
    }
  }

  const tileset_match = path.match(TILESET);

  if (tileset_match) {
    const g = tileset_match.groups!;
    const name = decode_name(g.NAME);
    if (name !== undefined) {
      return { ok: true, name, ext: "json" };
    }
  }

  return { ok: false, name: "", tile: [0, 0, 0], ext: "" };
};