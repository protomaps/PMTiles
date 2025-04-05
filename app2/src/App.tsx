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
} from "maplibre-gl";
import {
  type JSX,
  Show,
  createEffect,
  createResource,
  createSignal,
  onMount,
} from "solid-js";
import "maplibre-gl/dist/maplibre-gl.css";
import { default as layers } from "protomaps-themes-base";
import { GIT_SHA, createHash, parseHash } from "./utils";
import "@alenaksu/json-viewer";
import { SphericalMercator } from "@mapbox/sphericalmercator";
import { Protocol } from "pmtiles";
import { LayersPanel } from "./LayersPanel";
import { type Tileset, tilesetFromFile, tilesetFromString } from "./tileset";

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

function MapView(props: { tileset: Tileset }) {
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
      protocol.add(props.tileset.archive);
    }

    setRTLTextPlugin(
      "https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.2.3/mapbox-gl-rtl-text.min.js",
      true,
    );

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
            maxzoom: 15
          },
          tileset: {
            type: "vector",
            url: props.tileset.getMaplibreSourceUrl(),
          },
        },
        layers: layers("basemap", flavor, "en"),
      },
    });

    // map.showTileBoundaries = true;
    map.addControl(new NavigationControl({}), "top-left");
    map.addControl(new AttributionControl({compact:false}));

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

    // load the actual style
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
    <div class="flex-1 flex flex-col relative">
      <div class="flex-0">
        <button
          class="px-4 bg-indigo-500 rounded"
          type="button"
          onClick={fitToBounds}
        >
          fit to bounds
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

// TODO error display
function App() {
  const hash = parseHash(location.hash);
  const [tileset, setTileset] = createSignal<Tileset | undefined>(
    hash.url ? tilesetFromString(decodeURIComponent(hash.url)) : undefined,
  );
  const [showMetadata, setShowMetadata] = createSignal<boolean>(
    hash.showMetadata === "true" || false,
  );

  createEffect(() => {
    const t = tileset();
    if (t) {
      location.hash = createHash(location.hash, {
        url: t.getStateUrl() ? encodeURIComponent(t.getStateUrl()) : undefined,
        showMetadata: showMetadata() ? "true" : undefined,
      });
    }
  });

  const loadTileset: JSX.EventHandler<HTMLFormElement, Event> = (event) => {
    event.preventDefault();
    const formData = new FormData(event.target as HTMLFormElement);
    const urlValue = formData.get("url");
    if (typeof urlValue === "string") {
      setTileset(tilesetFromString(urlValue));
    }
  };

  const loadSample = (url: string) => {
    setTileset(tilesetFromString(url));
  };

  const ExampleChooser = () => {
    return (
      <div class="h-full flex items-center justify-center">
        <div>
          Load a sample .pmtiles:
          <div class="border border-gray-500">
            <button
              class="block p-2 flex justify-start flex-col hover:bg-indigo-500 w-full"
              type="button"
              onClick={() => {
                loadSample("https://demo-bucket.protomaps.com/v4.pmtiles");
              }}
            >
              <div>https://demo-bucket.protomaps.com/v4.pmtiles</div>
              <div class="text-xs">vector, global OpenStreetMap data</div>
            </button>

            <button
              class="block p-2 flex justify-start flex-col"
              type="button"
              onClick={() => {
                loadSample("https://demo-bucket.protomaps.com/v4.pmtiles");
              }}
            >
              <div>
                https://pmtiles.io/usgs-mt-whitney-8-15-webp-512.pmtiles
              </div>
              <div class="text-xs">raster, USGS landsat</div>
            </button>
          </div>
          or drag and drop a local file here
        </div>
      </div>
    );
  };

  const drop: JSX.EventHandler<HTMLDivElement, DragEvent> = (event) => {
    event.preventDefault();
    if (event.dataTransfer) {
      setTileset(tilesetFromFile(event.dataTransfer.files[0]));
    }
  };

  const dragover: JSX.EventHandler<HTMLDivElement, Event> = (event) => {
    event.preventDefault();
    return false;
  };

  return (
    <div
      class="flex flex-col h-dvh w-full dark:bg-gray-900 dark:text-white"
      ondragover={dragover}
      ondrop={drop}
    >
      <div class="flex-0 flex items-center">
        <div class="flex items-center p-2 flex-grow">
          <h1 class="text-xl">Map view</h1>
          <form onSubmit={loadTileset}>
            <input
              class="border w-100 mx-2 px-2"
              type="text"
              name="url"
              placeholder="TileJSON or .pmtiles"
              value={tileset() ? tileset()?.getStateUrl() : ""}
            />
            <button class="px-4 mx-2 bg-indigo-500 rounded" type="submit">
              load
            </button>
            <button
              class="px-4 rounded bg-indigo-500"
              onClick={() => {
                setShowMetadata(!showMetadata());
              }}
              type="button"
            >
              toggle metadata
            </button>
            <a
              href="https://github.com/protomaps/PMTiles"
              target="_blank"
              rel="noreferrer"
            >
              {GIT_SHA}
            </a>
          </form>
        </div>
        <a
          class="bg-gray-100 p-2"
          href={`/archive/#url=${tileset()?.getStateUrl()}`}
        >
          archive
        </a>
        <a
          class="bg-gray-200 p-2"
          href={`/tile/#url=${tileset()?.getStateUrl()}`}
        >
          tile
        </a>
      </div>
      <Show when={tileset()} fallback={<ExampleChooser />}>
        {(t) => (
          <div class="flex w-full h-full">
            <MapView tileset={t()} />
            <Show when={showMetadata()}>
              <div class="w-1/2">
                <JsonView tileset={t()} />
              </div>
            </Show>
          </div>
        )}
      </Show>
    </div>
  );
}

const root = document.getElementById("root");

if (root) {
  render(() => <App />, root);
}
