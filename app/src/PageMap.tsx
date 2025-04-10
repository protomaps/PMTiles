/* @refresh reload */
import { render } from "solid-js/web";
import "./index.css";
import {
  AttributionControl,
  Map as MaplibreMap,
  NavigationControl,
  Popup,
  addProtocol,
  setRTLTextPlugin,
  getRTLTextPluginStatus,
} from "maplibre-gl";
import {
  Show,
  createEffect,
  createResource,
  createSignal,
  onMount,
  type Setter,
} from "solid-js";
import "maplibre-gl/dist/maplibre-gl.css";
import { default as layers } from "protomaps-themes-base";
import { createHash, parseHash } from "./utils";
import "@alenaksu/json-viewer";
import { SphericalMercator } from "@mapbox/sphericalmercator";
import { Protocol } from "pmtiles";
import { LayersPanel } from "./LayersPanel";
import {
  type Tileset,
  type PMTilesTileset,
  tilesetFromString,
} from "./tileset";
import { Frame, ExampleChooser } from "./Frame";

declare module "solid-js" {
  namespace JSX {
    interface IntrinsicElements {
      "json-viewer": unknown;
    }
  }
}

const PopupContent = (props: {
  url?: string;
  z: number;
  x: number;
  y: number;
}) => {
  return (
    <div>
      <a
        class="underline"
        target="_blank"
        rel="noreferrer"
        href={`/tile/#zxy=${props.z}/${props.x}/${props.y}&url=${encodeURIComponent(props.url)}`}
      >
        Inspect tile {props.z}/{props.x}/{props.y}
      </a>
    </div>
  );
};

function MapView(props: {
  tileset: Tileset;
  showMetadata: boolean;
  setShowMetadata: Setter<boolean>;
}) {
  let mapContainer: HTMLDivElement | undefined;
  let hiddenRef: HTMLDivElement | undefined;
  const [zoom, setZoom] = createSignal<number>(0);
  const [activeLayers, setActiveLayers] = createSignal<string[] | undefined>();
  console.log(activeLayers);

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

    if (props.tileset.needsAddProtocol()) {
      protocol.add((props.tileset as PMTilesTileset).archive);
    }

    if (getRTLTextPluginStatus() === "unavailable") {
      setRTLTextPlugin(
        "https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.2.3/mapbox-gl-rtl-text.min.js",
        true,
      );
    }

    let flavor = "white";
    if (
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
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
              "© <a href='https://openstreetmap.org/copyright'>OpenStreetMap</a>",
          },
        },
        layers: layers("basemap", flavor, "en"),
      },
    });

    // map.showTileBoundaries = true;
    map.addControl(new NavigationControl({}), "top-left");
    map.addControl(new AttributionControl({ compact: false }), "bottom-right");

    setZoom(map.getZoom());
    map.on("zoom", (e) => {
      setZoom(e.target.getZoom());
    });
    map.on("click", (e) => {
      const sp = new SphericalMercator();
      const z = Math.floor(zoom());
      const result = sp.px([e.lngLat.lng, e.lngLat.lat], z);
      const tileX = Math.floor(result[0] / 256);
      const tileY = Math.floor(result[1] / 256);

      if (hiddenRef) {
        hiddenRef.innerHTML = "";
        render(
          () => (
            <PopupContent
              url={props.tileset.getStateUrl()}
              z={z}
              x={tileX}
              y={tileY}
            />
          ),
          hiddenRef,
        );
        popup.setHTML(hiddenRef.innerHTML);
        popup.setLngLat(e.lngLat);
        popup.addTo(map);
      }
    });
    map.on("load", async () => {
      if (await props.tileset.isVector()) {
        map.addSource("tileset", {
          type: "vector",
          url: props.tileset.getMaplibreSourceUrl(),
        });
        const vectorLayers = await props.tileset.getVectorLayers();
        for (const vectorLayer of vectorLayers) {
          map.addLayer({
            id: `tileset_fill_${vectorLayer}`,
            type: "fill",
            source: "tileset",
            "source-layer": vectorLayer,
            paint: {
              "fill-color": "steelblue",
              "fill-opacity": 0.1,
            },
            filter: ["==", ["geometry-type"], "Polygon"],
          });
          map.addLayer({
            id: `tileset_line_${vectorLayer}`,
            type: "line",
            source: "tileset",
            "source-layer": vectorLayer,
            paint: {
              "line-color": "steelblue",
            },
            filter: ["==", ["geometry-type"], "LineString"],
          });
          map.addLayer({
            id: `tileset_circle_outline_${vectorLayer}`,
            type: "circle",
            source: "tileset",
            "source-layer": vectorLayer,
            paint: {
              "circle-color": "red",
              "circle-radius": 3,
            },
            filter: ["==", ["geometry-type"], "Point"],
          });
          map.addLayer({
            id: `tileset_circle_${vectorLayer}`,
            type: "circle",
            source: "tileset",
            "source-layer": vectorLayer,
            paint: {
              "circle-color": "steelblue",
              "circle-radius": 2,
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

  return (
    <div class="flex w-full h-full">
      <div class="flex-1 flex flex-col relative">
        <div class="flex-0 p-4">
          <button
            class="px-4 bg-indigo-500 rounded"
            type="button"
            onClick={fitToBounds}
          >
            fit to bounds
          </button>
          <button
            class="px-4 rounded bg-indigo-500"
            onClick={() => {
              props.setShowMetadata(!props.showMetadata);
            }}
            type="button"
          >
            toggle metadata
          </button>
          zoom level: {zoom().toFixed(2)}
        </div>
        <div ref={mapContainer} class="h-full flex-1" />
        <div class="hidden" ref={hiddenRef} />
        <div class="absolute right-8 top-8">
          <LayersPanel
            tileset={props.tileset}
            setActiveLayers={setActiveLayers}
          />
        </div>
      </div>
      <Show when={props.showMetadata}>
        <div class="w-1/2">
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

  return (
    <div>
      <div>min lon, min lat, max lon, max lat:</div>
      <div>center zoom: </div>
      <div>center lon, center lat:</div>
      <json-viewer data={data()} />
    </div>
  );
};

function PageMap() {
  const hash = parseHash(location.hash);
  const [tileset, setTileset] = createSignal<Tileset | undefined>(
    hash.url ? tilesetFromString(decodeURIComponent(hash.url)) : undefined,
  );
  const [showMetadata, setShowMetadata] = createSignal<boolean>(
    hash.showMetadata === "true" || false,
  );

  createEffect(() => {
    const t = tileset();
    location.hash = createHash(location.hash, {
      url:
        t && t.getStateUrl() ? encodeURIComponent(t.getStateUrl()) : undefined,
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
