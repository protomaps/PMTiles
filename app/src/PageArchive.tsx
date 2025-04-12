/* @refresh reload */
import { render } from "solid-js/web";
import "./index.css";
import {
  type GeoJSONSource,
  Map as MaplibreMap,
  getRTLTextPluginStatus,
  setRTLTextPlugin,
} from "maplibre-gl";
import { type Entry, tileIdToZxy } from "pmtiles";
import { layers, namedFlavor } from "@protomaps/basemaps";
import "maplibre-gl/dist/maplibre-gl.css";
import { SphericalMercator } from "@mapbox/sphericalmercator";
import {
  For,
  type Setter,
  Show,
  createEffect,
  createResource,
  createSignal,
  onMount,
} from "solid-js";
import { ExampleChooser, Frame } from "./Frame";
import {
  type PMTilesTileset,
  type Tileset,
  tilesetFromString,
} from "./tileset";
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
      map.flyTo({
        center: [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2],
        zoom: Math.max(z - 4, 0),
      });
    }
  });

  onMount(() => {
    if (!mapContainer) {
      console.error("Could not mount map element");
      return;
    }

    if (getRTLTextPluginStatus() === "unavailable") {
      setRTLTextPlugin(
        "https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.2.3/mapbox-gl-rtl-text.min.js",
        true,
      );
    }

    let flavor = "white";
    if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
      flavor = "black";
    }

    map = new MaplibreMap({
      container: mapContainer,
      style: {
        version: 8,
        glyphs:
          "https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf",
        sprite: `https://protomaps.github.io/basemaps-assets/sprites/v4/${flavor}`,
        sources: {
          basemap: {
            type: "vector",
            tiles: [
              "https://api.protomaps.com/tiles/v4/{z}/{x}/{y}.mvt?key=1003762824b9687f",
            ],
            attribution:
              "© <a href='https://openstreetmap.org/copyright'>OpenStreetMap</a>",
            maxzoom: 15,
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
          ...layers("basemap", namedFlavor(flavor), { lang: "en" }),
          {
            id: "archive",
            source: "archive",
            type: "line",
            paint: {
              "line-color": "yellow",
              "line-opacity": 0.5,
            },
          },
          {
            id: "runs",
            source: "runs",
            type: "line",
            paint: {
              "line-color": "yellow",
            },
          },
          {
            id: "hoveredTile",
            source: "hoveredTile",
            type: "fill",
            paint: {
              "fill-color": "white",
              "fill-opacity": 0.3,
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
  tileContents?: number;
  addressedTiles?: number;
  totalEntries?: number;
  setHoveredTile: Setter<number | undefined>;
  setOpenedLeaf: Setter<number | undefined>;
}) {
  const [idx, setIdx] = createSignal<number>(0);

  return (
    <div class="flex-1 overflow-hidden">
      <div class="bg-gray-800 px-4 py-2">
        <span>
          entries {idx()}-{idx() + 999} of {props.entries.length}
        </span>
        <button
          class="mx-2"
          type="button"
          onClick={() => {
            setIdx(idx() - 1000);
          }}
        >
          prev
        </button>
        <button
          class="mx-2"
          type="button"
          onClick={() => {
            setIdx(idx() + 1000);
          }}
        >
          next
        </button>
      </div>
      <div class="h-full overflow-y-scroll">
        <table class="h-full text-right table-auto border-separate border-spacing-1 w-full pr-4">
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
            <For each={props.entries.slice(idx(), idx() + 1000)}>
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
                    {e.runLength === 0 ? "leaf" : e.runLength}
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

function ArchiveView(props: { tileset: PMTilesTileset }) {
  const [header] = createResource(props.tileset, async (t) => {
    return await t.archive.getHeader();
  });

  const [rootEntries] = createResource(header, async (h) => {
    return await props.tileset.archive.cache.getDirectory(
      props.tileset.archive.source,
      h.rootDirectoryOffset,
      h.rootDirectoryLength,
      h,
    );
  });

  const [openedLeaf, setOpenedLeaf] = createSignal<number | undefined>();
  const [hoveredTile, setHoveredTile] = createSignal<number | undefined>();

  const [leafEntries] = createResource(openedLeaf, async (o) => {
    const h = header();
    const root = rootEntries();

    if (!root) return;
    if (!h) return;

    const found = root.find((e) => e.tileId === o);
    if (!found) return;

    return await props.tileset.archive.cache.getDirectory(
      props.tileset.archive.source,
      h.leafDirectoryOffset + found.offset,
      found.length,
      h,
    );
  });

  return (
    <div class="flex-1 flex h-full w-full dark:bg-gray-900 dark:text-white font-mono text-sm">
      <div
        classList={{
          "w-1/3": leafEntries() !== undefined,
          "w-1/2": leafEntries() === undefined,
          flex: true,
          "flex-col": true,
          "h-full": true,
          "flex-1": true,
        }}
      >
        <Show when={header()}>
          {(h) => (
            <div class="flex-0">
              <table class="text-right table-auto border-separate border-spacing-1 p-4">
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
            </div>
          )}
        </Show>

        <DirectoryTable
          entries={rootEntries() || []}
          tilesetUrl={props.tileset.getStateUrl()}
          setHoveredTile={setHoveredTile}
          setOpenedLeaf={setOpenedLeaf}
        />
      </div>
      <Show when={leafEntries()}>
        {(l) => (
          <div class="flex w-1/3 h-full flex-1 overflow-hidden">
            <div class="w-full flex flex-1 overflow-hidden">
              <DirectoryTable
                entries={l()}
                tilesetUrl={props.tileset.getStateUrl()}
                setHoveredTile={setHoveredTile}
                setOpenedLeaf={setOpenedLeaf}
              />
            </div>
          </div>
        )}
      </Show>
      <div
        classList={{
          flex: true,
          "w-1/3": leafEntries() !== undefined,
          "w-1/2": leafEntries() === undefined,
          "flex-col": true,
        }}
      >
        <Show when={header()}>
          {(h) => (
            <>
              <div>clustered: {h().clustered ? "true" : "false"}</div>
              <div>total addressed tiles: {h().numAddressedTiles}</div>
              <div>total tile entries: {h().numTileEntries}</div>
              <div>total contents: {h().numTileContents}</div>
              <div>internal compression: {h().internalCompression}</div>
              <div>tile compression: {h().tileCompression}</div>
              <div>tile type: {h().tileType}</div>
              <div>min zoom: {h().minZoom}</div>
              <div>max zoom: {h().maxZoom}</div>
              <div>center zoom: {h().centerZoom}</div>
              <div>
                bounds: {h().minLon} {h().minLat} {h().maxLon} {h().maxLat}
              </div>
              <div>
                center: {h().centerLon} {h().centerLat}
              </div>
            </>
          )}
        </Show>
        <MapView
          entries={leafEntries() || rootEntries()}
          hoveredTile={hoveredTile()}
        />
      </div>
    </div>
  );
}

function PageArchive() {
  const hash = parseHash(location.hash);
  const [tileset, setTileset] = createSignal<Tileset | undefined>(
    hash.url ? tilesetFromString(decodeURIComponent(hash.url)) : undefined,
  );

  createEffect(() => {
    const t = tileset();
    if (t) {
      location.hash = createHash(location.hash, {
        url: t.getStateUrl() ? encodeURIComponent(t.getStateUrl()) : undefined,
      });
    }
  });

  return (
    <Frame tileset={tileset} setTileset={setTileset} page="archive">
      <Show
        when={tileset()}
        fallback={<ExampleChooser setTileset={setTileset} />}
      >
        {(t) => <ArchiveView tileset={t()} />}
      </Show>
    </Frame>
  );
}

const root = document.getElementById("root");

if (root) {
  render(() => <PageArchive />, root);
}
