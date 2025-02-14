/* @refresh reload */
import { render } from "solid-js/web";
import "./index.css";
import { Map as MaplibreMap, Popup, setRTLTextPlugin, addProtocol, NavigationControl } from "maplibre-gl";
import { type JSX, Show, createEffect, createResource, createSignal, onMount } from "solid-js";
import "maplibre-gl/dist/maplibre-gl.css";
import { default as layers } from "protomaps-themes-base";
import { GIT_SHA, createHash, parseHash } from "./utils";
import "@alenaksu/json-viewer";
import { SphericalMercator } from "@mapbox/sphericalmercator";
import { type Tileset, tilesetFromFile, tilesetFromString } from "./tileset";
import { LayersPanel } from "./LayersPanel";
import { Protocol } from "pmtiles";

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

  let map: MaplibreMap;

  onMount(() => {
    if (!mapContainer) {
      console.error("Could not mount map element");
      return;
    }

    setRTLTextPlugin(
      "https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.2.3/mapbox-gl-rtl-text.min.js",
      true
    );
    const protocol = new Protocol({metadata:true});
    addProtocol("pmtiles", protocol.tile);

    map = new MaplibreMap({
      hash: "map",
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
            maxzoom: 15,
            attribution: 'Basemap <a href="https://github.com/protomaps/basemaps">Protomaps</a> © <a href="https://openstreetmap.org">OpenStreetMap</a>'
          },
          tileset: {
            type: "vector",
            url: props.tileset.getMaplibreSourceUrl()
          }
        },
        layers: [
          ...layers("basemap", "white", "en"),
          {
            id: "water2",
            type: "fill",
            source: "tileset",
            "source-layer": "water",
            paint: {
              "fill-color":"black"
            }
          }
        ]
      },
    });

    map.showTileBoundaries = true;
    map.addControl(new NavigationControl({}), "bottom-left");

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
          () => <PopupContent url={props.tileset.getStateUrl()} z={z} x={tileX} y={tileY} />,
          hiddenRef,
        );
        popup.setHTML(hiddenRef.innerHTML);
        popup.setLngLat(e.lngLat);
        popup.addTo(map);
      }
    });
  });

  const fitToBounds = async () => {
    const bounds = await props.tileset.getBounds();
    map.fitBounds(
      [
        [bounds[0],bounds[1]],
        [bounds[2],bounds[3]],
      ],
      { animate: false }
    );
  }

  return (
    <div class="flex-1 flex flex-col relative">
      <div class="flex-0">
        <button class="px-4 bg-indigo-500 rounded" type="button" onClick={fitToBounds}>
          fit to bounds
        </button>
        zoom level: {zoom()}
      </div>
      <div ref={mapContainer} class="h-full flex-1" />
      <div class="hidden" ref={hiddenRef} />
      <div class="absolute right-8 top-8">
        <LayersPanel tileset={props.tileset} setActiveLayers={setActiveLayers}/>
      </div>
    </div>
  );
}

const JsonView = (props: {tileset:Tileset}) => {
  const [data] = createResource(async () => {
    return await props.tileset.getMetadata();
  });

  return <div>
    <div>
      min lon, min lat, max lon, max lat: 
    </div>
    <div>center zoom: </div>
    <div>
      center lon, center lat: 
    </div>
    <json-viewer data={data()} />;
  </div>
}

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
        url: encodeURIComponent(t.getStateUrl()),
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
   return <span>
      <button
        type="button"
        onClick={() => {
          loadSample("https://demo-bucket.protomaps.com/v4.pmtiles");
        }}
      >
        https://demo-bucket.protomaps.com/v4.pmtiles
      </button>
      <button
        type="button"
        onClick={() => {
          loadSample("https://pmtiles.io/usgs-mt-whitney-8-15-webp-512.pmtiles");
        }}
      >
        https://pmtiles.io/usgs-mt-whitney-8-15-webp-512.pmtiles
      </button>
      or drag and drop here...
    </span> 
  }

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
    <div class="flex flex-col h-dvh w-full" ondragover={dragover} ondrop={drop}>
      <div class="flex-0">
        <h1 class="text-xl">Map view</h1>
        <form onSubmit={loadTileset}>
          <input
            class="border w-100"
            type="text"
            name="url"
            placeholder="TileJSON or .pmtiles"
            value={tileset() ? tileset()?.getStateUrl() : ""}
          />
          <button class="px-4 bg-indigo-500" type="submit">
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
          <a href={`/archive/#url=${tileset()?.getStateUrl()}`}>archive inspector</a>
          <a href="https://github.com/protomaps/PMTiles" target="_blank">{GIT_SHA}</a>
        </form>
      </div>
      <Show
        when={tileset()}
        fallback={<ExampleChooser/>}
      >
        {(t) => 
        <div class="flex w-full h-full">
          <MapView tileset={t()} />
          <Show when={showMetadata()}>
            <div class="w-1/2">
              <JsonView tileset={t()}/>
            </div>
          </Show>
        </div>
        }
      </Show>
    </div>
  );
}

const root = document.getElementById("root");

if (root) {
  render(() => <App />, root);
}
