import { PMTiles, Source } from "../../js";

interface Env {
  BUCKET: R2Bucket;
  CACHE_TTL: string;
}

interface CacheEntry {
  lastUsed: number;
  buffer: Promise<ArrayBuffer>;
}

export class LRUCache {
  entries: Map<string, CacheEntry>;
  counter: number;

  constructor() {
    this.entries = new Map<string, CacheEntry>();
    this.counter = 0;
  }

  async get(
    bucket: R2Bucket,
    key: string,
    offset: number,
    length: number
  ): Promise<[boolean, DataView]> {
    let cacheKey = key + ":" + offset + "-" + length;
    let val = this.entries.get(cacheKey);
    if (val) {
      val.lastUsed = this.counter++;
      return [true, new DataView(await val.buffer)];
    }

    let resp = await bucket.get(key, {
      range: { offset: offset, length: length },
    });
    let a = (resp as R2ObjectBody).arrayBuffer();

    this.entries.set(cacheKey, {
      lastUsed: this.counter++,
      buffer: a,
    });
    if (this.entries.size > 128) {
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

    return [false, new DataView(await a)];
  }
}

let worker_cache = new LRUCache();

const TILE = new RegExp(
  /^\/([0-9a-zA-Z\/!\-_\.\*\'\(\)]+)\/(\d+)\/(\d+)\/(\d+).pbf$/
);

export default {
  async fetch(
    request: Request,
    env: Env,
    context: ExecutionContext
  ): Promise<Response> {
    let url = new URL(request.url);

    let match = url.pathname.match(TILE);

    let subrequests = 1;

    if (match) {
      class TempSource {
        getKey() {
          return "";
        }

        async getBytes(offset: number, length: number) {
          let result = await worker_cache.get(
            env.BUCKET,
            match![1] + ".pmtiles",
            offset,
            length
          );

          if (!result[0]) subrequests++;

          return result[1];
        }
      }

      let source = new TempSource();

      let p = new PMTiles(source);
      let metadata = await p.metadata();
      let entry = await p.getZxy(+match[2], +match[3], +match[4]);
      if (entry) {
        let tile = await env.BUCKET.get(match![1] + ".pmtiles", {
          range: { offset: entry.offset, length: entry.length },
        });

        let headers = new Headers();
        headers.set("Access-Control-Allow-Origin", "*");
        headers.set("Content-Type", "application/x-protobuf");
        headers.set("X-Pmap-Subrequests", subrequests.toString());

        if (metadata.compression === "gzip") {
          headers.set("Content-Encoding", "gzip");
        }

        return new Response((tile as R2ObjectBody).body, {
          headers: headers,
          encodeBody: "manual",
        } as any);
      }
    }
    return new Response("Not Found");
  },
};
