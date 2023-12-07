import { RangeResponse, Source } from "pmtiles";
import { BlobClient, ContainerClient } from "@azure/storage-blob";
import { DefaultAzureCredential } from "@azure/identity";
import { pmtiles_path } from "../../shared/index";

function streamToBuffer(stream: NodeJS.ReadableStream) {
  return new Promise<Uint8Array>((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    stream.on("data", (data) => {
      chunks.push(Buffer.isBuffer(data) ? data : Buffer.from(data));
    });
    stream.on("end", () => {
      resolve(new Uint8Array(Buffer.concat(chunks)));
    });
    stream.on("error", reject);
  });
}

function getAzureDetails(mapName: string) {
  const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
  const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME;
  const blobName = pmtiles_path(mapName, process.env.AZURE_STORAGE_BLOB_NAME);

  return {
    accountName,
    containerName,
    blobName,
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

  _blobClient?: BlobClient;

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
    const blobClient = this._getBlobClient();
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

  _getBlobClient() {
    if (this._blobClient) {
      return this._blobClient;
    }
    const baseUrl = `https://${this.accountName}.blob.core.windows.net`;

    const containerClient = new ContainerClient(
      `${baseUrl}/${this.containerName}`,
      new DefaultAzureCredential()
    );

    this._blobClient = containerClient.getBlobClient(this.blobName);

    return this._blobClient;
  }
}
