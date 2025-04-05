/* @refresh reload */
import { render } from "solid-js/web";
import "./index.css";
import {
  type GeoJSONSource,
  Map as MaplibreMap,
  setRTLTextPlugin,
} from "maplibre-gl";
import { type Entry, PMTiles, tileIdToZxy } from "pmtiles";
import { default as layers } from "protomaps-themes-base";
import "maplibre-gl/dist/maplibre-gl.css";
import { SphericalMercator } from "@mapbox/sphericalmercator";
import {
  For,
  type JSX,
  type Setter,
  Show,
  createEffect,
  createResource,
  createSignal,
  onMount,
} from "solid-js";
import { createHash, parseHash } from "./utils";

function MapView(props: {
  entries: Entry[] | undefined;
  hoveredTile?: number;
}) {
  let mapContainer: HTMLDivElement | undefined;

  const sp = new SphericalMercator();
  let map: MaplibreMap;

  createEffect(() => {
    const features = [];
    const featuresLines = [];

    if (props.entries) {
      for (const e of props.entries) {
        if (e.runLength === 1) {
          const [z, x, y] = tileIdToZxy(e.tileId);
          const bbox = sp.bbox(x, y, z);
          features.push({
            type: "Feature" as const,
            properties: {},
            geometry: {
              type: "Polygon" as const,
              coordinates: [
                [
                  [bbox[0], bbox[1]],
                  [bbox[2], bbox[1]],
                  [bbox[2], bbox[3]],
                  [bbox[0], bbox[3]],
                  [bbox[0], bbox[1]],
                ],
              ],
            },
          });
        } else {
          const coordinates = [];
          for (let i = e.tileId; i < e.tileId + e.runLength; i++) {
            const [z, x, y] = tileIdToZxy(i);
            const bbox = sp.bbox(x, y, z);
            const midX = (bbox[0] + bbox[2]) / 2;
            const midY = (bbox[1] + bbox[3]) / 2;
            coordinates.push([midX, midY]);
          }
          featuresLines.push({
            type: "Feature" as const,
            properties: {},
            geometry: { type: "LineString" as const, coordinates: coordinates },
          });
        }
      }
      (map.getSource("archive") as GeoJSONSource).setData({
        type: "FeatureCollection" as const,
        features: features,
      });
      (map.getSource("runs") as GeoJSONSource).setData({
        type: "FeatureCollection" as const,
        features: featuresLines,
      });
    }
  });

  createEffect(() => {
    if (props.hoveredTile) {
      const [z, x, y] = tileIdToZxy(props.hoveredTile);
      const bbox = sp.bbox(x, y, z);
      (map.getSource("hoveredTile") as GeoJSONSource).setData({
        type: "Polygon",
        coordinates: [
          [
            [bbox[0], bbox[1]],
            [bbox[2], bbox[1]],
            [bbox[2], bbox[3]],
            [bbox[0], bbox[3]],
            [bbox[0], bbox[1]],
          ],
        ],
      });
      map.flyTo({ center: [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2] });
    }
  });

  onMount(() => {
    if (!mapContainer) {
      console.error("Could not mount map element");
      return;
    }

    setRTLTextPlugin(
      "https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.2.3/mapbox-gl-rtl-text.min.js",
      true,
    );

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
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
            buffer: 16,
            tolerance: 0,
          },
          runs: {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
            buffer: 16,
            tolerance: 0,
          },
          hoveredTile: {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
            buffer: 16,
            tolerance: 0,
          },
        },
        layers: [
          ...layers("basemap", "white", "en"),
          {
            id: "archive",
            source: "archive",
            type: "fill",
            paint: {
              "fill-color": "steelblue",
              "fill-opacity": 0.6,
            },
          },
          {
            id: "runs",
            source: "runs",
            type: "line",
            paint: {
              "line-color": "steelblue",
            },
          },
          {
            id: "hoveredTile",
            source: "hoveredTile",
            type: "fill",
            paint: {
              "fill-color": "red",
            },
          },
        ],
      },
    });

    map.on("style.load", () => {
      map.setProjection({
        type: "globe",
      });
    });
  });

  return (
    <div class="flex-1 flex flex-col">
      <div ref={mapContainer} class="h-full flex-1" />
    </div>
  );
}

function isContiguous(entries: Entry[], entry: Entry, idx: number) {
  if (idx === 0) return true;
  const prev = entries[idx - 1];
  return entry.offset > prev.offset;
}

function DirectoryTable(props: {
  entries: Entry[];
  tilesetUrl: string;
  clustered: boolean;
  tileContents?: number;
  addressedTiles?: number;
  totalEntries?: number;
  setHoveredTile: Setter<number | undefined>;
  setOpenedLeaf: Setter<number | undefined>;
}) {
  return (
    <div class="w-full h-64">
      {/*      directory size: kb
      total entries: number
      total addressed tiles: numbber
      average leaf size: x
      total tile contents: x
*/}{" "}
      <table class="w-full">
        <tbody>
          <tr>
            <td># Addressed Tiles in directory</td>
            <td>0</td>
            <td># Tile Contents in directory</td>
            <td>0</td>
          </tr>
          <tr>
            <td># Entries in directory</td>
            <td>0</td>
            <td>Directory size</td>
            <td>abc</td>
          </tr>
        </tbody>
      </table>
      <div class="overflow-y-scroll h-full">
        <table class="text-right table-auto border-separate border-spacing-1 w-full">
          <thead>
            <tr>
              <th>tileID</th>
              <th class="text-indigo-700">z</th>
              <th class="text-indigo-700">x</th>
              <th class="text-indigo-700">y</th>
              <th>offset</th>
              <th>length</th>
              <th>runlength</th>
            </tr>
          </thead>
          <tbody>
            <For each={props.entries}>
              {(e, idx) => (
                <tr
                  class="hover:bg-indigo-700"
                  onMouseMove={() => props.setHoveredTile(e.tileId)}
                >
                  <td>{e.tileId}</td>
                  <td class="text-indigo-700">{tileIdToZxy(e.tileId)[0]}</td>
                  <td class="text-indigo-700">{tileIdToZxy(e.tileId)[1]}</td>
                  <td class="text-indigo-700">{tileIdToZxy(e.tileId)[2]}</td>
                  <td>
                    <a
                      class={
                        isContiguous(props.entries, e, idx())
                          ? "text-gray-800"
                          : "text-gray-300"
                      }
                      href={`/tile/#url=${props.tilesetUrl}&zxy=${tileIdToZxy(e.tileId).join("/")}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {e.offset}
                    </a>
                  </td>
                  <td>{e.length}</td>
                  <td onClick={() => props.setOpenedLeaf(e.tileId)}>
                    {e.runLength === 0 ? "leaf >" : e.runLength}
                  </td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// TODO error display
// url parameters: url (cannot be tilejson, must be local or remote pmtiles)
function ArchiveView() {
  const hash = parseHash(location.hash);
  const [tileset, setTileset] = createSignal<PMTiles | undefined>(
    hash.url ? new PMTiles(hash.url) : undefined,
  );

  const [header] = createResource(tileset, async (t) => {
    return await t.getHeader();
  });

  const [rootEntries] = createResource(tileset, async (t) => {
    const header = await t.getHeader();
    return await t.cache.getDirectory(
      t.source,
      header.rootDirectoryOffset,
      header.rootDirectoryLength,
      header,
    );
  });

  const [openedLeaf, setOpenedLeaf] = createSignal<number | undefined>();
  const [hoveredTile, setHoveredTile] = createSignal<number | undefined>();

  const [leafEntries] = createResource(openedLeaf, async (o) => {
    const h = header();
    const t = tileset();
    const root = rootEntries();

    if (!root) return;
    if (!h) return;

    const found = root.find((e) => e.tileId === o);
    if (!found) return;
    if (!t) return;

    return await t.cache.getDirectory(
      t.source,
      h.leafDirectoryOffset + found.offset,
      found.length,
      h,
    );
  });

  createEffect(() => {
    const t = tileset();
    if (t) {
      location.hash = createHash(location.hash, {
        url: t.source.getKey(),
        openedLeaf: openedLeaf()?.toString(),
      });
    }
  });

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
          <input type="text" name="url" placeholder="url for .pmtiles" />
          <button class="px-4 bg-indigo-500" type="submit">
            load
          </button>
        </form>
      </div>
      <Show when={tileset()} fallback={<span>fallback</span>}>
        {(t) => (
          <div class="w-full flex grow font-mono text-sm">
            <div class="w-1/3 flex flex-col h-full">
              <Show when={header()}>
                {(h) => (
                  <div>
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
                          <td>{h().rootDirectoryOffset}</td>
                          <td>{h().rootDirectoryLength}</td>
                        </tr>
                        <tr>
                          <td>Metadata</td>
                          <td>{h().jsonMetadataOffset}</td>
                          <td>{h().jsonMetadataLength}</td>
                        </tr>
                        <tr>
                          <td>Leaves</td>
                          <td>{h().leafDirectoryOffset}</td>
                          <td>{h().leafDirectoryLength}</td>
                        </tr>
                        <tr>
                          <td>Tile Data</td>
                          <td>{h().tileDataOffset}</td>
                          <td>{h().tileDataLength}</td>
                        </tr>
                      </tbody>
                    </table>
                    <div>clustered: {h().clustered}</div>
                    <div>total entries: {h().numTileEntries}</div>
                    <div>total contents: {h().numTileContents}</div>
                  </div>
                )}
              </Show>
              <div>internal compression: ?</div>
              <div>tile compression: ?</div>
              <div>tile type: ?</div>

              <div class="h-full">
                <DirectoryTable
                  entries={rootEntries()}
                  tilesetUrl={t().source.getKey()}
                  setHoveredTile={setHoveredTile}
                  setOpenedLeaf={setOpenedLeaf}
                  clustered={h().clustered}
                />
              </div>
            </div>
            <div class="flex w-1/3 h-full">
              <div class="w-full">
                <Show when={leafEntries()}>
                  {(l) => (
                    <DirectoryTable
                      entries={l()}
                      tilesetUrl={t().source.getKey()}
                      setHoveredTile={setHoveredTile}
                      setOpenedLeaf={setOpenedLeaf}
                      clustered={h().clustered}
                    />
                  )}
                </Show>
              </div>
            </div>
            <div class="flex w-1/3 flex-col">
              <div>
                <div>min zoom: ?</div>
                <div>max zoom: ?</div>
                <div>
                  min lon, min lat, max lon, max lat: {0}, {0}, {0}, {0}
                </div>
                <div>center zoom: {0}</div>
                <div>
                  center lon, center lat: {0}, {0}
                </div>
              </div>
              <MapView entries={leafEntries()} hoveredTile={hoveredTile()} />
            </div>
          </div>
        )}
      </Show>
    </div>
  );
}

const root = document.getElementById("root");

if (root) {
  render(() => <ArchiveView />, root);
}
