## 1.0.0

* Port code to TypeScript.
* add proper CJS, ESM and IIFE build artifacts.
* `url` option to `PMTilesVectorSource`/`PMTilesRasterSource` is either string URL or a `pmtiles.Source`.
* remove option `headers`, instead create a `FetchSource` and specify custom headers:

```js
 const fetchSource = new pmtiles.FetchSource(
  "https://r2-public.protomaps.com/protomaps-sample-datasets/nz-buildings-v3.pmtiles",
  new Headers({'X-Abc':'Def'}),
);
```
