/* @refresh reload */
import { render } from "solid-js/web";
import "./index.css";
import { createHash, parseHash } from "./utils";
import { type JSX, Show, createEffect, createMemo, createResource, createSignal, onMount } from "solid-js";
import { tileIdToZxy, PMTiles } from "pmtiles";
import { Map as MaplibreMap } from "maplibre-gl";
import { default as layers } from "protomaps-themes-base";
import "maplibre-gl/dist/maplibre-gl.css";
import { SphericalMercator } from "@mapbox/sphericalmercator";

function MapView(props: {entries: Entry[]}) {
  let mapContainer: HTMLDivElement | undefined;

  const sp = new SphericalMercator();
  let map;

  let geojson = createMemo(() => {
    const coordinates = [];
    if (props.entries) {
      const coordinates = [];
      for (const e of props.entries) { 
        const [z,x,y] = tileIdToZxy(e.tileId);
        const bbox = sp.bbox(x,y,z);
        const midX = (bbox[0] + bbox[2]) / 2;
        const midY = (bbox[1] + bbox[3]) / 2;
        coordinates.push([midX,midY]);
      }
      console.log(coordinates);
      map.getSource("archive").setData({
        type:"LineString",
        coordinates: coordinates
      })
    }
  })

  onMount(() => {
    if (!mapContainer) {
      console.error("Could not mount map element");
      return;
    }

    map = new MaplibreMap({
      container: mapContainer,
      style: {
        version: 8,
        glyphs:
          "https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf",
        sprite: "https://protomaps.github.io/basemaps-assets/sprites/v4/white",
        sources: {
          basemap: {
            type: "vector",
            tiles: [
              "https://api.protomaps.com/tiles/v4/{z}/{x}/{y}.mvt?key=1003762824b9687f",
            ],
          },
          archive: {
            type: 'geojson',
            data: {type: 'FeatureCollection', 'features': []}
          }
        },
        layers: [...layers("basemap", "white", "en"),
          {
            id: "archive",
            source: "archive",
            type: "line",
            paint: {
              "line-color": "steelblue"
            }
          }
        ]
      },
    });

    map.on('style.load', () => {
      map.setProjection({
        type: 'globe'
      });
    });
  });

  return (
    <div class="flex-1 flex flex-col">
      <div ref={mapContainer} class="h-full flex-1" />
    </div>
  );
}

// url parameters: url (cannot be tilejson, must be local or remote pmtiles)
function ArchiveView() {
  const hash = parseHash(location.hash);
  const [tileset, setTileset] = createSignal<PMTiles | undefined>(
    hash.url ? new PMTiles(hash.url) : undefined,
  );

  const [entries, setEntries] = createSignal<Entry[]>([]);

  const [header] = createResource(tileset, async (t) => {
    return await t.getHeader();
  });

  const [rootEntries] = createResource(tileset, async (t) => {
    const header = await t.getHeader();
    return await t.cache.getDirectory(
      t.source,
      header.rootDirectoryOffset,
      header.rootDirectoryLength,
      header
    );
  });

  const [openedLeaf, setOpenedLeaf] = createSignal<number | undefined>();

  const [leafEntries] = createResource(openedLeaf, async (o) => {
    const h = header();
    const t = tileset();
    const root = rootEntries();

    const found = root.find(e => e.tileId === o);

    return await t.cache.getDirectory(
      t.source,
      h.leafDirectoryOffset + found.offset,
      found.length,
      h
    )
  }); 

  // createEffect(() => {
  //   const t = tileset();
  //   if (t) {
  //     location.hash = createHash(location.hash, {
  //       url: t.url,
  //     });
  //   }
  // });

  const loadTileset: JSX.EventHandler<HTMLFormElement, Event> = (event) => {
    event.preventDefault();
    const formData = new FormData(event.target as HTMLFormElement);
    const urlValue = formData.get("url");
    if (typeof urlValue === "string") {
      setTileset(new PMTiles(urlValue));
    }
  };

  return (
    <div class="flex flex-col h-dvh w-full">
      <div class="">
        <h1 class="text-xl">Archive inspector</h1>
        <form onSubmit={loadTileset}>
          <input
            class="border"
            type="text"
            name="url"
            placeholder="url for .pmtiles"
          />
          <button class="px-4 bg-indigo-500" type="submit">
            load
          </button>
        </form>
      </div>
      <Show when={tileset() !== undefined} fallback={<span>fallback</span>}>
        <div class="w-full flex grow font-mono text-sm">
          <div class="w-1/3 bg-indigo-400 overflow-y-scroll">
            <Show when={header()}>
              <table class="text-right table-auto border-separate border-spacing-1">
                <thead>
                  <tr>
                    <th>Layout (bytes)</th>
                    <th>offset</th>
                    <th>length</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Root</td>
                    <td>{header().rootDirectoryOffset}</td>
                    <td>{header().rootDirectoryLength}</td>
                  </tr>
                  <tr>
                    <td>Metadata</td>
                    <td>{header().jsonMetadataOffset}</td>
                    <td>{header().jsonMetadataLength}</td>
                  </tr>
                  <tr>
                    <td>Leaves</td>
                    <td>{header().leafDirectoryOffset}</td>
                    <td>{header().leafDirectoryLength}</td>
                  </tr>
                  <tr>
                    <td>Tile Data</td>
                    <td>{header().tileDataOffset}</td>
                    <td>{header().tileDataLength}</td>
                  </tr>
                </tbody>
              </table>
            </Show>
            <div>num addressed tiles: {0}</div>
            <div>num tile entries: {0}</div>
            <div>num tile contents: {0}</div>
            <div>clustered: ?</div>
            <div>internal compression: ?</div>
            <div>tile compression: ?</div>
            <div>tile type: ?</div>
            <div>min zoom: ?</div>
            <div>max zoom: ?</div>
            <div>
              min lon, min lat, max lon, max lat: {0}, {0}
              , {0}, {0}
            </div>
            <div>center zoom: {0}</div>
            <div>
              center lon, center lat: {0}, {0}
            </div>


            <div class="h-40 overflow-y-scroll border">
              <table>
                <tbody>
                  <For each={rootEntries()}>
                    {(e) => <tr>
                      <td>{e.tileId}</td>
                      <td>{e.offset}</td>
                      <td>{e.length}</td>
                      <td onClick={() => setOpenedLeaf(e.tileId)}>{e.runLength}</td>
                    </tr>}
                  </For>
                </tbody>
              </table>
            </div>
            total size: x, total entries y
          </div>
          <div class="flex w-1/3 border">
            <div class="h-40 overflow-y-scroll border">
              <Show when={leafEntries() !== undefined}>
                <table>
                  <tbody>
                    <For each={leafEntries()}>
                      {(e) => <tr>
                        <td>{e.tileId}</td>
                        <td>{e.offset}</td>
                        <td>{e.length}</td>
                        <td>{e.runLength}</td>
                      </tr>}
                    </For>
                  </tbody>
                </table>
              </Show>
            </div>
          </div>
          <div class="flex w-1/3">
            <MapView entries={leafEntries()}/>
          </div>
        </div>
      </Show>
    </div>
  );
}

const root = document.getElementById("root");

if (root) {
  render(() => <ArchiveView />, root);
}
