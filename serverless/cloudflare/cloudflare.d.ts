// copied from https://github.com/cloudflare/workers-types/blob/master/index.d.ts 
// see https://github.com/cloudflare/workers-types/issues/164

/**
 * An instance of the R2 bucket binding.
 */
interface R2Bucket {
  head(key: string): Promise<R2Object | null>;
  get(key: string): Promise<R2ObjectBody | null>;
  /**
   * Returns R2Object on a failure of the conditional specified in onlyIf.
   */
  get(
    key: string,
    options: R2GetOptions
  ): Promise<R2ObjectBody | R2Object | null>;
  get(
    key: string,
    options?: R2GetOptions
  ): Promise<R2ObjectBody | R2Object | null>;
  put(
    key: string,
    value:
      | ReadableStream
      | ArrayBuffer
      | ArrayBufferView
      | string
      | null
      | Blob,
    options?: R2PutOptions
  ): Promise<R2Object>;
  delete(key: string): Promise<void>;
  list(options?: R2ListOptions): Promise<R2Objects>;
}

/**
 * Perform the operation conditionally based on meeting the defined criteria.
 */
interface R2Conditional {
  etagMatches?: string;
  etagDoesNotMatch?: string;
  uploadedBefore?: Date;
  uploadedAfter?: Date;
}

/**
 * Options for retrieving the object metadata nad payload.
 */
interface R2GetOptions {
  onlyIf?: R2Conditional | Headers;
  range?: R2Range;
}

/**
 * Metadata that's automatically rendered into R2 HTTP API endpoints.
 * ```
 * * contentType -> content-type
 * * contentLanguage -> content-language
 * etc...
 * ```
 * This data is echoed back on GET responses based on what was originally
 * assigned to the object (and can typically also be overriden when issuing
 * the GET request).
 */
interface R2HTTPMetadata {
  contentType?: string;
  contentLanguage?: string;
  contentDisposition?: string;
  contentEncoding?: string;
  cacheControl?: string;
  cacheExpiry?: Date;
}

interface R2ListOptions {
  limit?: number;
  prefix?: string;
  cursor?: string;
  delimiter?: string;
  /**
   * If you populate this array, then items returned will include this metadata.
   * A tradeoff is that fewer results may be returned depending on how big this
   * data is. For now the caps are TBD but expect the total memory usage for a list
   * operation may need to be <1MB or even <128kb depending on how many list operations
   * you are sending into one bucket. Make sure to look at `truncated` for the result
   * rather than having logic like
   * ```
   * while (listed.length < limit) {
   *   listed = myBucket.list({ limit, include: ['customMetadata'] })
   * }
   * ```
   */
  include?: ("httpMetadata" | "customMetadata")[];
}

/**
 * The metadata for the object.
 */
declare abstract class R2Object {
  readonly key: string;
  readonly version: string;
  readonly size: number;
  readonly etag: string;
  readonly httpEtag: string;
  readonly uploaded: Date;
  readonly httpMetadata: R2HTTPMetadata;
  readonly customMetadata: Record<string, string>;
  writeHttpMetadata(headers: Headers): void;
}

/**
 * The metadata for the object and the body of the payload.
 */
interface R2ObjectBody extends R2Object {
  readonly body: ReadableStream;
  readonly bodyUsed: boolean;
  arrayBuffer(): Promise<ArrayBuffer>;
  text(): Promise<string>;
  json<T>(): Promise<T>;
  blob(): Promise<Blob>;
}

interface R2Objects {
  objects: R2Object[];
  truncated: boolean;
  cursor?: string;
  delimitedPrefixes: string[];
}

interface R2PutOptions {
  httpMetadata?: R2HTTPMetadata | Headers;
  customMetadata?: Record<string, string>;
  md5?: ArrayBuffer | string;
}

declare type R2Range =
  | { offset: number; length?: number }
  | { offset?: number; length: number }
  | { suffix: number };

interface ReadResult {
  value?: any;
  done: boolean;
}

interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
}