# Protomaps on Azure

You are probably best off following the guides at [Microsoft](https://learn.microsoft.com/en-us/azure/azure-functions/functions-overview?pivots=programming-language-javascript). Create a new function app and copy the code in this repo to the app.

## Development

Remember to copy the `index.ts` and `v2.ts` from the top level `js/` directory and update the imports.

## Deployment

Follow the instructions in the official documentation.

Add one setting to the function app called `PMTILES_PATH` which should contain the URL to the pmtiles file. The pmtiles file must be hosted at a provider that support the [`Range` header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Range), e.g. Azure Blob Storage (remember to set appropriate access level on the container)

## Notes

This code can probably be used for any back end (not tested). Just replace the code in `index.ts` with the entry point of choice and use `get.ts` with whatever `Source` you like.
