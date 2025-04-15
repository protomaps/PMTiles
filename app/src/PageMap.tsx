/* @refresh reload */
import "./index.css";
import { layers, namedFlavor } from "@protomaps/basemaps";
import {
  AttributionControl,
  type MapGeoJSONFeature,
  Map as MaplibreMap,
  NavigationControl,
  Popup,
  addProtocol,
  getRTLTextPluginStatus,
  setRTLTextPlugin,
} from "maplibre-gl";
import {
  type Setter,
  Show,
  createEffect,
  createMemo,
  createResource,
  createSignal,
  onMount,
} from "solid-js";
import { render } from "solid-js/web";
import "@alenaksu/json-viewer";
import { SphericalMercator } from "@mapbox/sphericalmercator";
import { Protocol } from "pmtiles";
import { FeatureTable } from "./FeatureTable";
import { ExampleChooser, Frame } from "./Frame";
import { type LayerVisibility, LayersPanel } from "./LayersPanel";
import { type Tileset, tilesetFromString } from "./tileset";
import { colorForIdx, createHash, parseHash, tileInspectUrl } from "./utils";

declare module "solid-js" {
  namespace JSX {
    interface IntrinsicElements {
      "json-viewer": unknown;
    }
  }
}

function MapView(props: {
  tileset: Tileset;
  showMetadata: boolean;
  setShowMetadata: Setter<boolean>;
  mapHashPassed: boolean;
}) {
  let mapContainer: HTMLDivElement | undefined;
  let hiddenRef: HTMLDivElement | undefined;
  const [zoom, setZoom] = createSignal<number>(0);
  const [showTileBoundaries, setShowTileBoundaries] =
    createSignal<boolean>(false);
  const [inspectFeatures, setInspectFeatures] = createSignal<boolean>(false);
  const [layerVisibility, setLayerVisibility] = createSignal<LayerVisibility[]>(
    [],
  );
  const [hoveredFeatures, setHoveredFeatures] = createSignal<
    MapGeoJSONFeature[]
  >([]);
  const [frozen, setFrozen] = createSignal<boolean>(false);

  const inspectableFeatures = createMemo(() => {
    return hoveredFeatures().map((h) => {
      return {
        layerName: h.sourceLayer || "unknown",
        id: (h.id as number) || 0,
        properties: h.properties,
        type: h._vectorTileFeature.type,
      };
    });
  });

  const popup = new Popup({
    closeButton: false,
    closeOnClick: false,
    maxWidth: "none",
  });

  const protocol = new Protocol({ metadata: true });
  addProtocol("pmtiles", protocol.tile);

  let map: MaplibreMap;

  onMount(async () => {
    if (!mapContainer) {
      console.error("Could not mount map element");
      return;
    }

    const archiveForProtocol = props.tileset.archiveForProtocol();
    if (archiveForProtocol) {
      protocol.add(archiveForProtocol);
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
      hash: "map",
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
            maxzoom: 15,
            attribution:
              "Background © <a href='https://openstreetmap.org/copyright'>OpenStreetMap</a>",
          },
        },
        layers: [],
      },
    });

    createEffect(() => {
      map.showTileBoundaries = showTileBoundaries();
    });

    createEffect(() => {
      if (inspectFeatures()) {
        setFrozen(false);
      } else {
        for (const hoveredFeature of hoveredFeatures()) {
          map.setFeatureState(hoveredFeature, { hover: false });
        }
        popup.remove();
      }
    });

    map.addControl(new NavigationControl({}), "top-left");
    map.addControl(new AttributionControl({ compact: false }), "bottom-right");

    if (!props.mapHashPassed) {
      fitToBounds();
    }

    setZoom(map.getZoom());
    map.on("zoom", (e) => {
      setZoom(e.target.getZoom());
    });
    map.on("mousemove", async (e) => {
      if (frozen()) return;
      if (!showTileBoundaries() && !inspectFeatures()) {
        return;
      }

      for (const hoveredFeature of hoveredFeatures()) {
        map.setFeatureState(hoveredFeature, { hover: false });
      }

      const { x, y } = e.point;
      const r = 2; // radius around the point
      let features = map.queryRenderedFeatures([
        [x - r, y - r],
        [x + r, y + r],
      ]);
      features = features.filter((feature) => feature.source === "tileset");

      for (const feature of features) {
        map.setFeatureState(feature, { hover: true });
      }

      setHoveredFeatures(features);

      const currentZoom = zoom();
      const sp = new SphericalMercator();
      const maxZoom = await props.tileset.getMaxZoom();
      const z = Math.min(maxZoom, Math.floor(currentZoom));
      const result = sp.px([e.lngLat.lng, e.lngLat.lat], z);
      const tileX = Math.floor(result[0] / 256);
      const tileY = Math.floor(result[1] / 256);

      if (hiddenRef) {
        hiddenRef.innerHTML = "";
        render(
          () => (
            <div>
              <FeatureTable features={inspectableFeatures()} />
              <a
                class="block text-xs w-full bg-gray-800 hover:bg-gray-600 mt-2 text-center"
                target="_blank"
                rel="noreferrer"
                href={tileInspectUrl(props.tileset.getStateUrl(), [
                  z,
                  tileX,
                  tileY,
                ])}
              >
                Tile {z}/{tileX}/{tileY}
              </a>
            </div>
          ),
          hiddenRef,
        );
        popup.setHTML(hiddenRef.innerHTML);
        popup.setLngLat(e.lngLat);
        popup.addTo(map);
      }
    });

    map.on("click", () => {
      setFrozen(!frozen());
    });

    map.on("load", async () => {
      if (await props.tileset.isOverlay()) {
        for (const l of layers("basemap", namedFlavor(flavor), {
          lang: "en",
        })) {
          map.addLayer(l);
        }
      }

      if (await props.tileset.isVector()) {
        map.addSource("tileset", {
          type: "vector",
          url: props.tileset.getMaplibreSourceUrl(),
        });
        const vectorLayers = await props.tileset.getVectorLayers();
        setLayerVisibility(vectorLayers.map((v) => ({ id: v, visible: true })));
        for (const [i, vectorLayer] of vectorLayers.entries()) {
          map.addLayer({
            id: `tileset_fill_${vectorLayer}`,
            type: "fill",
            source: "tileset",
            "source-layer": vectorLayer,
            paint: {
              "fill-color": colorForIdx(i),
              "fill-opacity": [
                "case",
                ["boolean", ["feature-state", "hover"], false],
                0.25,
                0.1,
              ],
            },
            filter: ["==", ["geometry-type"], "Polygon"],
          });
          map.addLayer({
            id: `tileset_line_${vectorLayer}`,
            type: "line",
            source: "tileset",
            "source-layer": vectorLayer,
            paint: {
              "line-color": colorForIdx(i),
              "line-width": [
                "case",
                ["boolean", ["feature-state", "hover"], false],
                2,
                0.5,
              ],
            },
            filter: ["==", ["geometry-type"], "LineString"],
          });
          map.addLayer({
            id: `tileset_circle_${vectorLayer}`,
            type: "circle",
            source: "tileset",
            "source-layer": vectorLayer,
            paint: {
              "circle-color": colorForIdx(i),
              "circle-radius": [
                "case",
                ["boolean", ["feature-state", "hover"], false],
                5,
                3,
              ],
            },
            filter: ["==", ["geometry-type"], "Point"],
          });
          map.addLayer({
            id: `tileset_point_label_${vectorLayer}`,
            type: "symbol",
            source: "tileset",
            "source-layer": vectorLayer,
            layout: {
              "text-field": ["get", "name"],
              "text-font": ["Noto Sans Regular"],
              "text-size": 10,
            },
            paint: {
              "text-color": colorForIdx(i),
            },
            filter: ["==", ["geometry-type"], "Point"],
          });
        }
      } else {
        map.addSource("tileset", {
          type: "raster",
          url: props.tileset.getMaplibreSourceUrl(),
        });
        map.addLayer({
          source: "tileset",
          id: "tileset_raster",
          type: "raster",
        });
      }
    });
  });

  const fitToBounds = async () => {
    const bounds = await props.tileset.getBounds();
    map.fitBounds(
      [
        [bounds[0], bounds[1]],
        [bounds[2], bounds[3]],
      ],
      { animate: false },
    );
  };

  createEffect(() => {
    const setVisibility = (layerName: string, visibility: string) => {
      if (map.getLayer(layerName)) {
        map.setLayoutProperty(layerName, "visibility", visibility);
      }
    };

    for (const { id, visible } of layerVisibility()) {
      const visibility = visible ? "visible" : "none";
      setVisibility(`tileset_fill_${id}`, visibility);
      setVisibility(`tileset_line_${id}`, visibility);
      setVisibility(`tileset_circle_${id}`, visibility);
      setVisibility(`tileset_point_label_${id}`, visibility);
    }
  });

  return (
    <div class="flex flex-col md:flex-row w-full h-full">
      <div class="flex-1 flex flex-col">
        <div class="flex-none p-4 flex justify-between text-xs md:text-base space-x-2">
          <button
            class="px-4 bg-indigo-500 rounded cursor-pointer hover:bg-indigo-400"
            type="button"
            onClick={fitToBounds}
          >
            fit to bounds
          </button>
          <span class="border border-gray-600 rounded px-2 flex items-center">
            <input
              class="mr-1"
              id="inspectFeatures"
              checked={inspectFeatures()}
              type="checkbox"
              onChange={() => {
                setInspectFeatures(!inspectFeatures());
              }}
            />
            <label for="inspectFeatures">Inspect features</label>
          </span>
          <span class="border border-gray-600 rounded px-2 flex items-center">
            <input
              class="mr-1"
              id="showTileBoundaries"
              checked={showTileBoundaries()}
              type="checkbox"
              onChange={() => {
                setShowTileBoundaries(!showTileBoundaries());
              }}
            />
            <label for="showTileBoundaries">Show tile bounds</label>
          </span>
          <button
            class="px-4 rounded bg-indigo-500 hover:bg-indigo-400 cursor-pointer"
            onClick={() => {
              props.setShowMetadata(!props.showMetadata);
            }}
            type="button"
          >
            view metadata
          </button>
        </div>
        <div class="relative flex-1 h-full">
          <div
            ref={mapContainer}
            classList={{
              "h-full": true,
              "flex-1": true,
              inspectFeatures: inspectFeatures(),
              frozen: frozen(),
            }}
          />
          <div class="hidden" ref={hiddenRef} />
          <div class="absolute right-2 top-2 z-0">
            <LayersPanel
              layerVisibility={layerVisibility}
              setLayerVisibility={setLayerVisibility}
            />
          </div>
          <div class="absolute left-2 bottom-2">
            <div class="bg-white dark:bg-gray-900 dark:text-white rounded p-2 border border-gray-300 dark:border-gray-700 flex flex-col text-center w-16">
              <div class="text-xs text-gray-400">ZOOM</div>
              <div class="text-lg">{zoom().toFixed(2)}</div>
            </div>
          </div>
        </div>
      </div>
      <Show when={props.showMetadata}>
        <div class="md:w-1/2 z-[999] bg-white dark:bg-gray-900 p-4">
          <JsonView tileset={props.tileset} />
        </div>
      </Show>
    </div>
  );
}

const JsonView = (props: { tileset: Tileset }) => {
  const [data] = createResource(async () => {
    return await props.tileset.getMetadata();
  });

  return <json-viewer data={data()} />;
};

function PageMap() {
  let hash = parseHash(location.hash);

  // the previous version of the PMTiles viewer
  // used query params ?url= instead of #url=
  // this makes it backward compatible so old-style links still work.
  const href = new URL(window.location.href);
  const queryParamUrl = href.searchParams.get("url");
  if (queryParamUrl) {
    href.searchParams.delete("url");
    history.pushState(null, "", href.toString());
    location.hash = createHash(location.hash, {
      url: queryParamUrl,
      map: hash.map,
    });
    hash = parseHash(location.hash);
  }

  const mapHashPassed = hash.map !== undefined;
  const [tileset, setTileset] = createSignal<Tileset | undefined>(
    hash.url ? tilesetFromString(decodeURIComponent(hash.url)) : undefined,
  );
  const [showMetadata, setShowMetadata] = createSignal<boolean>(
    hash.showMetadata === "true" || false,
  );

  createEffect(() => {
    const t = tileset();
    const stateUrl = t?.getStateUrl();
    location.hash = createHash(location.hash, {
      url: stateUrl ? encodeURIComponent(stateUrl) : undefined,
      showMetadata: showMetadata() ? "true" : undefined,
    });
  });

  return (
    <Frame tileset={tileset} setTileset={setTileset} page="map">
      <Show
        when={tileset()}
        fallback={<ExampleChooser setTileset={setTileset} />}
      >
        {(t) => (
          <MapView
            tileset={t()}
            showMetadata={showMetadata()}
            setShowMetadata={setShowMetadata}
            mapHashPassed={mapHashPassed}
          />
        )}
      </Show>
    </Frame>
  );
}

const root = document.getElementById("root");

if (root) {
  render(() => <PageMap />, root);
}
