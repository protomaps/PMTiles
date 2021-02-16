# PMTiles

PMTiles is a single-file archive format for tiled data. A PMTiles archive can be hosted on a commodity storage platform such as S3, and enables low-cost, zero-maintenance map applications that are "serverless" - free of a custom tile backend or third party provider. 

For those familiar with [Cloud Optimized GeoTIFFs](https://www.cogeo.org) - PMTiles uses similar techniques, but is specific to Z/X/Y tiles and can store vector data.

# Compatible Storage Providers

PMTiles files require servers to support [HTTP byte serving](https://developer.mozilla.org/en-US/docs/Web/HTTP/Range_requests) as well as [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS). It's been tested with:

* [Amazon Web Services S3](#amazon-web-services)
* [Google Cloud Storage](#google-cloud)
* [Microsoft Azure](#azure)
* [DigitalOcean Spaces](#digitalocean-spaces)
* [Backblaze B2](#backblaze-b2)
* Your own HTTP server

### Amazon Web Services

* ACL Level
* CORS Policy

### Google Cloud


### Azure
* HEAD requests for ranges return 200 instead of 206
* Configuration through Web Portal

### DigitalOcean Spaces


### Backblaze B2