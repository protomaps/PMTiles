

# Compatible Storage Providers

PMTiles files require servers to support  [HTTP byte serving](https://developer.mozilla.org/en-US/docs/Web/HTTP/Range_requests) as well as [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS). It's been tested with:

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