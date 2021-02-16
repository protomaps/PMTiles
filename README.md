# PMTiles

PMTiles is a single-file archive format for tiled data. A PMTiles archive can be hosted on a commodity storage platform such as S3, and enables low-cost, zero-maintenance map applications that are "serverless" - free of a custom tile backend or third party provider. 

For those familiar with [Cloud Optimized GeoTIFFs](https://www.cogeo.org) - PMTiles uses similar techniques, but is specific to Z/X/Y tiles and can store vector data.


# Map Libraries

## Leaflet

## MapLibre GL

# Storage Providers

PMTiles files require servers to support [HTTP byte serving](https://developer.mozilla.org/en-US/docs/Web/HTTP/Range_requests) as well as [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS). It's been tested with:

* [Amazon S3](#amazon-s3)
* [Google Cloud Storage](#google-cloud)
* [Microsoft Azure](#azure)
* [DigitalOcean Spaces](#digitalocean-spaces)
* [Backblaze B2](#backblaze-b2)
* Your own HTTP server

### Amazon S3

1. From your S3 Bucket's "Permissions" tab, scroll to the Cross-origin resource sharing (CORS) editor.
2. Add this JSON policy, replacing "https://example.com" with your domains or "\*" for all domains. See [The S3 CORS documentation](https://docs.aws.amazon.com/AmazonS3/latest/userguide/cors.html).


    [
        {
            "AllowedHeaders": ["Range"],
            "AllowedMethods": ["GET","HEAD"],
            "AllowedOrigins": ["https://example.com"]
        }
    ]

3. Ensure that your S3 objects have public read access.

### Google Cloud

* See the [Cloud Storage CORS documentation](https://cloud.google.com/storage/docs/cross-origin)


    [
        {
          "origin": ["https://example.com"],
          "method": ["GET","HEAD"],
          "responseHeader": ["range"],
          "maxAgeSeconds": 300
        }
    ]

### Azure
* HEAD requests for ranges return 200 instead of 206
* Configuration through Web Portal

### DigitalOcean Spaces


### Backblaze B2
* See [B2 CORS Rules](https://www.backblaze.com/b2/docs/cors_rules.html)


    [
        {
          "corsRuleName": "allowHeaders",
          "allowedOrigins": ["https://example.com"],
          "allowedOperations":["b2_download_file_by_name"],
          "allowedHeaders": ["range"],
          "maxAgeSeconds": 300
        }
    ]