

# Compatible Storage Providers

PMTiles files require support for HTTP 1.1 byte serving as well as CORS. It's been tested with:

* [Amazon Web Services S3](###amazon-web-services)
* Google Cloud Storage
* Microsoft Azure
* DigitalOcean Spaces
* Backblaze B2
* Your own HTTP server

### Amazon Web Services

* ACL Level
* CORS Policy

### Google Cloud


### Azure

* HEAD requests for ranges return 200 instead of 206