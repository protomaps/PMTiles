import fs from "fs";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

export class MockServer {
  etag?: string;
  numRequests: number;
  lastCache?: string;

  reset() {
    this.numRequests = 0;
    this.etag = undefined;
  }

  constructor() {
    this.numRequests = 0;
    this.etag = undefined;
    const serverBuffer = fs.readFileSync("test/data/test_fixture_1.pmtiles");
    const server = setupServer(
      http.get(
        "http://localhost:1337/example.pmtiles",
        ({ request, params }) => {
          this.lastCache = request.cache;
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
      )
    );
    server.listen({ onUnhandledRequest: "error" });
  }
}
