const TILE =
  /^\/(?<NAME>[0-9a-zA-Z\/!\-_\.\*\'\(\)]+)\/(?<Z>\d+)\/(?<X>\d+)\/(?<Y>\d+).(?<EXT>[a-z]+)$/;

export interface TilePath {
  ok: boolean;
  name: string;
  tile: [number, number, number];
  ext: string;
}

export const tile_path = (path: string, setting?: string): TilePath => {
  let pattern = TILE;
  if (setting) {
    // escape regex
    setting = setting.replace(/[.*+?^$()|[\]\\]/g, "\\$&");
    setting = setting.replace("{name}", "(?<NAME>[0-9a-zA-Z/!-_.*'()]+)");
    setting = setting.replace("{z}", "(?<Z>\\d+)");
    setting = setting.replace("{x}", "(?<X>\\d+)");
    setting = setting.replace("{y}", "(?<Y>\\d+)");
    setting = setting.replace("{ext}", "(?<EXT>[a-z]+)");
    pattern = new RegExp(setting);
  }

  let match = path.match(pattern);

  if (match) {
    const g = match.groups!;
    return { ok: true, name: g.NAME, tile: [+g.Z, +g.X, +g.Y], ext: g.EXT };
  }
  return { ok: false, name: "", tile: [0, 0, 0], ext: "" };
};
