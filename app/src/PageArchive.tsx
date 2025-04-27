/* @refresh reload */
import "maplibre-gl/dist/maplibre-gl.css";
import "./index.css";
import { SphericalMercator } from "@mapbox/sphericalmercator";
import { layers, namedFlavor } from "@protomaps/basemaps";
import {
  AttributionControl,
  type GeoJSONSource,
  Map as MaplibreMap,
  getRTLTextPluginStatus,
  setRTLTextPlugin,
} from "maplibre-gl";
import { Compression, type Entry, tileIdToZxy, tileTypeExt } from "pmtiles";
import {
  type Accessor,
  For,
  type Setter,
  Show,
  createEffect,
  createMemo,
  createResource,
  createSignal,
  onMount,
} from "solid-js";
import { render } from "solid-js/web";
import { ExampleChooser, Frame } from "./Frame";
import { PMTilesTileset, type Tileset, tilesetFromString } from "./tileset";
import { createHash, formatBytes, parseHash, tileInspectUrl } from "./utils";

const NONE = Number.MAX_VALUE;

const compressionToString = (t: Compression) => {
  if (t === Compression.Unknown) return "unknown";
  if (t === Compression.None) return "none";
  if (t === Compression.Gzip) return "gzip";
  if (t === Compression.Brotli) return "brotli";
  if (t === Compression.Zstd) return "zstd";
  return "out of spec";
};

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
      attributionControl: false,
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
              "line-color": "#3131DC",
              "line-opacity": 0.8,
              "line-width": 2,
            },
          },
          {
            id: "runs",
            source: "runs",
            type: "line",
            paint: {
              "line-color": "#ffffff",
              "line-opacity": 0.3,
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
    map.addControl(new AttributionControl({ compact: false }), "bottom-right");

    map.on("style.load", () => {
      map.setProjection({
        type: "globe",
      });
      map.resize();
    });
  });

  return (
    <div class="flex-1 flex flex-col">
      <div ref={mapContainer} class="h-full flex-1" />
    </div>
  );
}

function DirectoryTable(props: {
  entries: Entry[];
  stateUrl: string | undefined;
  setHoveredTile: Setter<number | undefined>;
  setOpenedLeaf: Setter<number>;
  isLeaf?: boolean;
}) {
  const [idx, setIdx] = createSignal<number>(0);

  const canNavigate = (targetIdx: number) => {
    return targetIdx >= 0 && targetIdx < props.entries.length;
  };

  return (
    <div class="flex-1 overflow-hidden">
      <div class="app-well md:px-4 md:py-2 flex">
        <span class="flex-1">
          entries {idx()}-{idx() + 999} of {props.entries.length}
        </span>
        <Show when={props.isLeaf}>
          <button
            class="mx-2 underline cursor-pointer"
            type="button"
            onClick={() => props.setOpenedLeaf(NONE)}
          >
            close
          </button>
        </Show>
        <button
          classList={{
            "mx-2": true,
            underline: canNavigate(idx() - 1000),
            "app-text-light": !canNavigate(idx() - 1000),
            "cursor-pointer": true,
          }}
          type="button"
          onClick={() => {
            setIdx(idx() - 1000);
          }}
          disabled={!canNavigate(idx() - 1000)}
        >
          prev
        </button>
        <button
          classList={{
            "mx-2": true,
            underline: canNavigate(idx() + 1000),
            "app-text-light": !canNavigate(idx() + 1000),
            "cursor-pointer": true,
          }}
          type="button"
          onClick={() => {
            setIdx(idx() + 1000);
          }}
          disabled={!canNavigate(idx() + 1000)}
        >
          next
        </button>
      </div>
      <div class="h-full overflow-y-scroll">
        <table class="h-full text-right table-auto border-separate border-spacing-1 w-full pr-4">
          <thead>
            <tr>
              <th>tileID</th>
              <th>z</th>
              <th>x</th>
              <th>y</th>
              <th>offset</th>
              <th>length</th>
              <th>runlength</th>
            </tr>
          </thead>
          <tbody>
            <For each={props.entries.slice(idx(), idx() + 1000)}>
              {(e) => (
                <tr
                  class="hover:bg-purple"
                  onMouseMove={() => props.setHoveredTile(e.tileId)}
                >
                  <td>{e.tileId}</td>
                  <td class="app-text-light">{tileIdToZxy(e.tileId)[0]}</td>
                  <td class="app-text-light">{tileIdToZxy(e.tileId)[1]}</td>
                  <td class="app-text-light">{tileIdToZxy(e.tileId)[2]}</td>
                  <td>
                    <Show
                      when={e.runLength === 0}
                      fallback={
                        <a
                          classList={{
                            underline: true,
                          }}
                          href={tileInspectUrl(
                            props.stateUrl,
                            tileIdToZxy(e.tileId),
                          )}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {e.offset}
                        </a>
                      }
                    >
                      <button
                        type="button"
                        class="underline cursor-pointer"
                        onClick={() => props.setOpenedLeaf(e.tileId)}
                      >
                        {e.offset}
                      </button>
                    </Show>
                  </td>
                  <td>{e.length}</td>
                  <td>
                    <Show when={e.runLength === 0} fallback={e.runLength}>
                      0 (leaf)
                    </Show>
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

function ArchiveView(props: { genericTileset: Accessor<Tileset> }) {
  const tileset = createMemo(() => {
    const g = props.genericTileset();
    if (g instanceof PMTilesTileset) {
      return g as PMTilesTileset;
    }
    alert("This isn't a PMTiles archive!");
    throw "This isn't a PMTiles tileset";
  });

  const [header] = createResource(tileset, async (t) => {
    return await t.archive.getHeader();
  });

  const [rootEntries] = createResource(header, async (h) => {
    return await tileset().archive.cache.getDirectory(
      tileset().archive.source,
      h.rootDirectoryOffset,
      h.rootDirectoryLength,
      h,
    );
  });

  const [openedLeaf, setOpenedLeaf] = createSignal<number>(NONE);
  const [hoveredTile, setHoveredTile] = createSignal<number | undefined>();

  const [leafEntries] = createResource(openedLeaf, async (o) => {
    if (o === NONE) return;
    const h = header();
    const root = rootEntries();

    if (!root) return;
    if (!h) return;

    const found = root.find((e) => e.tileId === o);
    if (!found) return;

    return await tileset().archive.cache.getDirectory(
      tileset().archive.source,
      h.leafDirectoryOffset + found.offset,
      found.length,
      h,
    );
  });

  return (
    <div class="flex-1 flex h-full w-full font-mono text-xs md:text-sm">
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
            <div class="flex-none overflow-x-scroll">
              <table class="text-right table-auto border-separate border-spacing-2 p-4 w-full text-xs">
                <thead>
                  <tr class="app-text-light">
                    <th>Layout (bytes)</th>
                    <th>offset</th>
                    <th>length</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="app-text-light">Root Dir</td>
                    <td>{h().rootDirectoryOffset}</td>
                    <td>{formatBytes(h().rootDirectoryLength)}</td>
                  </tr>
                  <tr>
                    <td class="app-text-light">Metadata</td>
                    <td>{h().jsonMetadataOffset}</td>
                    <td>{formatBytes(h().jsonMetadataLength)}</td>
                  </tr>
                  <tr>
                    <td class="app-text-light">Leaf Dirs</td>
                    <td>{h().leafDirectoryOffset}</td>
                    <td>{formatBytes(h().leafDirectoryLength || 0)}</td>
                  </tr>
                  <tr>
                    <td class="app-text-light">Tile Data</td>
                    <td>{h().tileDataOffset}</td>
                    <td>{formatBytes(h().tileDataLength || 0)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </Show>

        <DirectoryTable
          entries={rootEntries() || []}
          stateUrl={props.genericTileset().getStateUrl()}
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
                stateUrl={props.genericTileset().getStateUrl()}
                setHoveredTile={setHoveredTile}
                setOpenedLeaf={setOpenedLeaf}
                isLeaf
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
            <div class="flex text-xs overflow-x-scroll">
              <table class="table-auto border-separate border-spacing-2 w-1/2">
                <tbody>
                  <tr>
                    <td class="text-right app-text-light">Addressed tiles</td>
                    <td>{h().numAddressedTiles.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td class="text-right app-text-light">Tile entries</td>
                    <td>{h().numTileEntries.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td class="text-right app-text-light">Tile contents</td>
                    <td>{h().numTileContents.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td class="text-right app-text-light">Clustered</td>
                    <td>{h().clustered ? "true" : "false"}</td>
                  </tr>
                  <tr>
                    <td class="text-right app-text-light">
                      Internal compression
                    </td>
                    <td>{compressionToString(h().internalCompression)}</td>
                  </tr>
                  <tr>
                    <td class="text-right app-text-light">Tile compression</td>
                    <td>{compressionToString(h().tileCompression)}</td>
                  </tr>
                </tbody>
              </table>
              <table class="table-auto border-separate border-spacing-2 w-1/2">
                <tbody>
                  <tr>
                    <td class="text-right app-text-light">Tile type</td>
                    <td>{tileTypeExt(h().tileType)}</td>
                  </tr>
                  <tr>
                    <td class="text-right app-text-light">Min zoom</td>
                    <td>{h().minZoom}</td>
                  </tr>
                  <tr>
                    <td class="text-right app-text-light">Max zoom</td>
                    <td>{h().maxZoom}</td>
                  </tr>
                  <tr>
                    <td class="text-right app-text-light">Center zoom</td>
                    <td>{h().centerZoom}</td>
                  </tr>
                  <tr>
                    <td class="text-right app-text-light">Bounds</td>
                    <td>
                      {h().minLon} {h().minLat} {h().maxLon} {h().maxLat}
                    </td>
                  </tr>
                  <tr>
                    <td class="text-right app-text-light">Center</td>
                    <td>
                      {h().centerLon} {h().centerLat}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
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
    const stateUrl = t?.getStateUrl();
    location.hash = createHash(location.hash, {
      url: stateUrl ? encodeURIComponent(stateUrl) : undefined,
    });
  });

  return (
    <Frame tileset={tileset} setTileset={setTileset} page="archive" pmtilesOnly>
      <Show
        when={tileset()}
        fallback={<ExampleChooser setTileset={setTileset} />}
      >
        {(t) => <ArchiveView genericTileset={t} />}
      </Show>
    </Frame>
  );
}

const root = document.getElementById("root");

if (root) {
  render(() => <PageArchive />, root);
}
