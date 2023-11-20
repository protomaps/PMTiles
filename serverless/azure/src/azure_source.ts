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

function getAzureDetails(mapName: string) {
  let defaultAccountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
  let defaultContainerName = process.env.AZURE_STORAGE_CONTAINER_NAME;
  let defaultBlobName = process.env.AZURE_STORAGE_BLOB_NAME;

  const mapAccountName = process.env[`AZURE_STORAGE_ACCOUNT_NAME_${mapName}`];
  const mapContainerName =
    process.env[`AZURE_STORAGE_CONTAINER_NAME_${mapName}`];
  const mapBlobName = process.env[`AZURE_STORAGE_BLOB_NAME_${mapName}`];

  return {
    accountName: mapAccountName ?? defaultAccountName,
    containerName: mapContainerName ?? defaultContainerName,
    blobName: mapBlobName ?? defaultBlobName,
  };
}

export function getAzureStorageSource(key: string): AzureStorageSource | null {
  const { accountName, containerName, blobName } = getAzureDetails(key);

  if (!(accountName && containerName && blobName)) {
    return null;
  }

  return new AzureStorageSource(key, accountName, containerName, blobName);
}

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
      data: data.buffer,
      etag: b.etag,
      cacheControl: b.cacheControl,
    };
  }

  getKey() {
    return this.key;
  }
}
