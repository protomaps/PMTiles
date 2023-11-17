import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { Headers } from "undici";
import { getZxy } from "./get";
import { FetchSource, Source } from "pmtiles";
import { tile_path } from "./tile_path";
import { AzureStorageSource } from "./azure_source";

function getAzureDetails(mapName: string) {
  let accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
  let containerName = process.env.AZURE_STORAGE_CONTAINER_NAME;
  let blobName = process.env.AZURE_STORAGE_BLOB_NAME;

  if (!accountName) {
    accountName = process.env[`AZURE_STORAGE_ACCOUNT_NAME_${mapName}`];
  }

  if (!containerName) {
    containerName = process.env[`AZURE_STORAGE_CONTAINER_NAME_${mapName}`];
  }

  if (!blobName) {
    blobName = process.env[`AZURE_STORAGE_BLOB_NAME_${mapName}`];
  }

  return {
    accountName,
    containerName,
    blobName,
  };
}

function getSource(name: string): Source | null {
  let mapUrl = process.env["PMTILES_PATH"];
  const mapName = name ?? "default";

  if (mapName !== "default") {
    mapUrl = process.env[`PMTILES_PATH_${name}`];
  }

  if (mapUrl) {
    return new FetchSource(mapUrl);
  }

  const { accountName, containerName, blobName } = getAzureDetails(mapName);

  if (accountName && containerName && blobName) {
    return new AzureStorageSource(
      mapName,
      accountName,
      containerName,
      blobName
    );
  }

  return null;
}

export async function httpTrigger(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const url = new URL(request.url);
  const { ok, name, tile, ext } = tile_path(
    url.pathname,
    process.env["TILE_PATH"]
  );

  let allowed_origin = "*";
  if (typeof process.env["ALLOWED_ORIGINS"] !== "undefined") {
    for (let o of process.env["ALLOWED_ORIGINS"].split(",")) {
      if (o === request.headers.get("Origin") || o === "*") {
        allowed_origin = o;
      }
    }
  }

  if (!ok) {
    let headers = new Headers();

    headers.set("Access-Control-Allow-Origin", allowed_origin);
    return Promise.resolve({ body: "Invalid URL", status: 404, headers });
  }

  const source = getSource(name);

  if (!source) {
    console.warn(`Invalid map name ${name}`);
    let headers = new Headers();
    headers.set("Access-Control-Allow-Origin", allowed_origin);
    return Promise.resolve({
      body: "Invalid map name",
      status: 404,
      headers,
    });
  }

  return getZxy(source, tile, ext, allowed_origin, request.headers.get("etag"));
}

app.http("tiles", {
  route: "{name}/{z:int}/{x:int}/{y:int}.{ext}",
  methods: ["GET"],
  authLevel: "anonymous",
  handler: httpTrigger,
});
