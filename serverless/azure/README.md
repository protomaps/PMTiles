# Protomaps on Azure

You are probably best off following the guides at [Microsoft](https://learn.microsoft.com/en-us/azure/azure-functions/functions-overview?pivots=programming-language-javascript). Create a new function app and copy the code in this repo to the app.

## Development

Add reference to (pmtiles)[https://www.npmjs.com/package/pmtiles].

## Deployment

Follow the instructions in the official Azure Functions documentation. The URL has the following pattern `{name}/{z:int}/{x:int}/{y:int}.{ext}`. Where `name` is the map name and will be used to get the corresponding pmtiles file. The value for `ext` is normally `mvt`. The function app (application) code is in `index.ts`, which you can implement however you choose. The code in `get.ts` and `azure_source.ts` can be used as is.

In the example `index.ts`, it is possible to get the `pmtiles` blob in two ways.

- Using Azure Storage managed identities by specifying storage account details.
- Using URL:s by specifying `FETCH_PMTILES_PATH`.

Either way works fine. If you use the URL, make sure the Function App has access to the file, e.g. by using SAS token URL:s.

### Azure Storage managed identities

Resolve the details to get the blob in Azure storage, this is the default implementation.

- `AZURE_STORAGE_ACCOUNT_NAME` Specify the account name.
- `AZURE_STORAGE_CONTAINER_NAME` Specify the container name.
- `AZURE_STORAGE_BLOB_NAME` Specify the blob path/name. If the name contains `{name}` it will be replaced with the map `{name}` from the request URL.

Grant the function app access to the storage, link (this)[https://learn.microsoft.com/en-us/azure/app-service/tutorial-connect-app-access-storage-javascript].
TLDR;

- Enable managed identity on the app.
- Give the identity access to the storage.

NOTE: As of 2023-11-20, using managed identities seems a lot slower than using SAS token URL:s. Test and compare in your case before selecting a solution.

### URL

Add one setting to the function app called `FETCH_PMTILES_PATH` which can contain the URL to the pmtiles file. The pmtiles file must be hosted at a provider that support the [`Range` header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Range), e.g. Azure Blob Storage (remember to set appropriate access level on the container). If the path contains `{name}` it will be replaced with the map `{name}` from the request URL.

In the example implementation, the `FETCH_PMTILES_PATH` overrides all Azure storage details, so you cannot mix source types depending on map name, but you can implement your own version of `getSource` if you need to.

## Notes

If you want to support multiple Azure accounts and storage containers or a different strategy for getting the blob name you can just replace the call to `getAzureStorageSource` with your own implementation.

This code can probably be used for any back end (not tested). Just replace the code in `index.ts` with the entry point of choice and use `get.ts` with whatever `Source` you like.
