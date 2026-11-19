# pmtiles

```sh
pip install pmtiles
```

To export only the overview levels of an archive:

```sh
pmtiles-convert world.pmtiles overview.mbtiles --maxzoom 5
```

The same limit applies to directory exports and to Python callers of
`all_tiles(get_bytes, maxzoom=5)`. Higher-zoom tile data and directories
containing only higher-zoom entries are skipped.

## Running Tests

```sh
python -m unittest test/test_*
```

## Uploading build

```sh
python -m build
twine upload dist/*
```

## Status

For asynchronous I/O, see [aiopmtiles](https://github.com/developmentseed/aiopmtiles)
