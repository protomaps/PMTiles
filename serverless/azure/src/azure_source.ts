import { RangeResponse, Source } from "pmtiles";
import { ContainerClient } from "@azure/storage-blob";
import { DefaultAzureCredential } from "@azure/identity";

function streamToBuffer(stream: NodeJS.ReadableStream) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    stream.on("data", (data) => {
      chunks.push(Buffer.isBuffer(data) ? data : Buffer.from(data));
    });
    stream.on("end", () => {
      resolve(Buffer.concat(chunks));
    });
    stream.on("error", reject);
  });
}

module.exports = { streamToBuffer };

export class AzureStorageSource implements Source {
  readonly key: string;
  readonly accountName: string;
  readonly containerName: string;
  readonly blobName: string;

  constructor(
    key: string,
    accountName: string,
    containerName: string,
    blobName: string
  ) {
    this.key = key;
    this.accountName = accountName;
    this.containerName = containerName;
    this.blobName = blobName;
  }

  async getBytes(
    offset: number,
    length: number,
    signal?: AbortSignal | undefined
  ): Promise<RangeResponse> { 
    const baseUrl = `https://${this.accountName}.blob.core.windows.net`;

    const containerClient = new ContainerClient(
      `${baseUrl}/${this.containerName}`,
      new DefaultAzureCredential()
    );

    const blobClient = containerClient.getBlobClient(this.blobName);
    const b = await blobClient.download(offset, length, {
      abortSignal: signal,
    });

    if (!b.readableStreamBody) {
      throw "Invalid stream";
    }

    const data = await streamToBuffer(b.readableStreamBody);

    return {
      data,
      etag: b.etag,
      cacheControl: b.cacheControl,
    };
  }

  getKey() {
    return this.key;
  }
}
