export const GIT_SHA = (import.meta.env.VITE_GIT_SHA || "").substr(0, 8);

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

export function zxyFromHash(s: string): [number,number,number] | undefined {
  const split = s.split("/");
  if (split.length !== 3) return undefined;
  return split.map(n => +n) as [number,number,number];
}


