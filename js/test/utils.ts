import fs from "fs";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

class MockServer {
  etag?: string;
  numRequests: number;
  lastCache?: string;
  lastRequestHeaders: Headers | null;
  lastCredentials?: string;

  reset() {
    this.numRequests = 0;
    this.etag = undefined;
    this.lastRequestHeaders = null;
  }

  constructor() {
    this.numRequests = 0;
    this.etag = undefined;
    this.lastRequestHeaders = null;
    const serverBuffer = fs.readFileSync("test/data/test_fixture_1.pmtiles");
    const server = setupServer(
      http.get(
        "http://localhost:1337/example.pmtiles",
        ({ request, params }) => {
          this.lastCache = request.cache;
          this.lastRequestHeaders = request.headers;
          this.lastCredentials = request.credentials;
          this.numRequests++;
          const range = request.headers.get("range")?.substr(6).split("-");
          if (!range) {
            throw new Error("invalid range");
          }
          const offset = +range[0];
          const length = +range[1];
          const body = serverBuffer.slice(offset, offset + length - 1);
          return new HttpResponse(body, {
            status: 206,
            statusText: "OK",
            headers: { etag: this.etag } as HeadersInit,
          });
        }
      ),
      http.get("http://localhost:1337/small.pmtiles", ({ request }) => {
        this.lastRequestHeaders = request.headers;
        this.lastCredentials = request.credentials;
        this.numRequests++;
        const range = request.headers.get("range")?.substr(6).split("-");
        if (!range) {
          throw new Error("invalid range");
        }
        const rangeEnd = +range[1];
        if (rangeEnd >= serverBuffer.length) {
          return new HttpResponse(null, {
            status: 416,
            headers: {
              "Content-Range": `bytes */${serverBuffer.length}`,
            },
          });
        }
        const rangeStart = +range[0];
        const body = serverBuffer.slice(rangeStart, rangeEnd + 1);
        return new HttpResponse(body, {
          status: 206,
          headers: { etag: this.etag } as HeadersInit,
        });
      })
    );
    server.listen({ onUnhandledRequest: "error" });
  }
}

export const mockServer = new MockServer();
