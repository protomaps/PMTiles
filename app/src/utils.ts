import { schemeSet3 } from "d3-scale-chromatic";

export const GIT_SHA = (import.meta.env.VITE_GIT_SHA || "dev").substr(0, 8);

export function colorForIdx(idx: number) {
  return schemeSet3[idx % 12];
}

// Get the hash contents as a map.
export function parseHash(hash: string): Record<string, string> {
  const retval: Record<string, string> = {};
  for (const pair of hash.replace("#", "").split("&")) {
    const parts = pair.split("=");
    retval[parts[0]] = parts[1];
  }
  return retval;
}

// Given the current hash and a record of string->strings, creates the new hash
export function createHash(
  currentHash: string,
  newHash: Record<string, string | undefined>,
): string {
  const current = parseHash(currentHash);
  const combined = { ...current, ...newHash };
  return `#${Object.entries(combined)
    .filter(([_, value]) => {
      return value !== undefined;
    })
    .map(([key, value]) => {
      return `${key}=${value}`;
    })
    .join("&")}`;
}

export function zxyFromHash(s: string): [number, number, number] | undefined {
  const split = s.split("/");
  if (split.length !== 3) return undefined;
  return split.map((n) => +n) as [number, number, number];
}

export function tileInspectUrl(
  stateUrl: string | undefined,
  zxy: [number, number, number],
): string {
  const hashParams = [`zxy=${zxy[0]}/${zxy[1]}/${zxy[2]}`];
  if (stateUrl) {
    hashParams.push(`url=${stateUrl}`);
  }
  return `/tile/#${hashParams.join("&")}`;
}

export function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = [
    "Bytes",
    "KiB",
    "MiB",
    "GiB",
    "TiB",
    "PiB",
    "EiB",
    "ZiB",
    "YiB",
  ];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(dm))} ${sizes[i]}`;
}
