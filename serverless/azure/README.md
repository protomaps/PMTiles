# Protomaps on Azure

You are probably best off following the guides at [Microsoft](https://learn.microsoft.com/en-us/azure/azure-functions/functions-overview?pivots=programming-language-javascript). Create a new function app and copy the code in this repo to the app.

## Development

Add reference to (pmtiles)[https://www.npmjs.com/package/pmtiles].

## Deployment

Follow the instructions in the official Azure Functions documentation. The URL has the following pattern `{name}/{z:int}/{x:int}/{y:int}.{ext}`. Where `ext` is normally `mvt`.

It is possible to get the `pmtiles` blob in two ways.

- Using Azure Storage managed identities by specifying storage account details.
- Using URL:s by specifying PMTILES_PATH.

Either way works fine. If you use the URL, make sure the Function App has access to the file, e.g. by using SAS token URL:s.

### Azure Storage managed identities

Resolve the details to get the blob in Azure storage

- `AZURE_STORAGE_ACCOUNT_NAME` Specify the default account name.
- `AZURE_STORAGE_CONTAINER_NAME` Specify the default container name.
- `AZURE_STORAGE_BLOB_NAME` Specify the blob default path/name.

Each variable can be override it for a specific map name, by adding another variable postfixes with `_{name}`, e.g. `AZURE_STORAGE_CONTAINER_NAME_europe` and `AZURE_STORAGE_BLOB_NAME_europe`. If no override exist, it will use the default value.

Grant the function app access to the storage, link (this)[https://learn.microsoft.com/en-us/azure/app-service/tutorial-connect-app-access-storage-javascript].
TLDR;

- Enable managed identity on the app.
- Give the identity access to the storage.

NOTE: As of 2023-11-20, using managed identities seems a lot slower than using SAS token URL:s. Test and compare in your case before selecting a solution. 

### URL

Add one setting to the function app called `PMTILES_PATH` which should contain the URL to the pmtiles file. The pmtiles file must be hosted at a provider that support the [`Range` header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Range), e.g. Azure Blob Storage (remember to set appropriate access level on the container). The name of the map in the URL is `default`.

You can add more maps by adding `PMTILES_PATH_{name}`, where `{name}` corresponds to the map name in the URL.

## Notes

This code can probably be used for any back end (not tested). Just replace the code in `index.ts` with the entry point of choice and use `get.ts` with whatever `Source` you like.
