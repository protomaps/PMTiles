/* @refresh reload */
import { render } from "solid-js/web";
import "./index.css";
import { Map as MaplibreMap, Popup } from "maplibre-gl";
import { type JSX, Show, createEffect, createSignal, onMount } from "solid-js";
import "maplibre-gl/dist/maplibre-gl.css";
import { default as layers } from "protomaps-themes-base";
import { createHash, parseHash } from "./utils";
import "@alenaksu/json-viewer";
import { SphericalMercator } from "@mapbox/sphericalmercator";
import { Tileset } from "./tileset";
import { LayerPanel } from "./LayerPanel";

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
        href={`/tile/#zxy=${props.z}/${props.x}/${props.y}&url=${props.url}`}
      >
        Inspect tile {props.z}/{props.x}/{props.y}
      </a>
    </div>
  );
};

function MapView(props: { url?: string }) {
  let mapContainer: HTMLDivElement | undefined;
  let hiddenRef: HTMLDivElement | undefined;
  const [zoom, setZoom] = createSignal<number>(0);

  const popup = new Popup({
    closeButton: false,
    closeOnClick: false,
    maxWidth: "none",
  });

  onMount(() => {
    if (!mapContainer) {
      console.error("Could not mount map element");
      return;
    }

    const map = new MaplibreMap({
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
          },
        },
        layers: layers("basemap", "white", "en"),
      },
    });

    map.showTileBoundaries = true;

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
          () => <PopupContent url={props.url} z={z} x={tileX} y={tileY} />,
          hiddenRef,
        );
        popup.setHTML(hiddenRef.innerHTML);
        popup.setLngLat(e.lngLat);
        popup.addTo(map);
      }
    });
  });

  return (
    <div class="flex-1 flex flex-col relative">
      <div class="flex-0">
        <button class="px-4" type="button">
          fit to bounds
        </button>
        zoom level: {zoom()}
      </div>
      <div ref={mapContainer} class="h-full flex-1" />
      <div class="hidden" ref={hiddenRef} />
      <div class="absolute right-8">
        <LayerPanel/>
      </div>
    </div>
  );
}

function App() {
  const hash = parseHash(location.hash);
  const [tileset, setTileset] = createSignal<Tileset | undefined>(
    hash.url ? new Tileset(hash.url) : undefined,
  );
  const [showMetadata, setShowMetadata] = createSignal<boolean>(
    hash.showMetadata === "true" || false,
  );

  createEffect(() => {
    const t = tileset();
    if (t) {
      location.hash = createHash(location.hash, {
        url: t.url,
        showMetadata: showMetadata() ? "true" : undefined,
      });
    }
  });

  const loadTileset: JSX.EventHandler<HTMLFormElement, Event> = (event) => {
    event.preventDefault();
    const formData = new FormData(event.target as HTMLFormElement);
    const urlValue = formData.get("url");
    if (typeof urlValue === "string") {
      setTileset(new Tileset(urlValue));
    }
  };

  const loadSample = (url: string) => {
    setTileset(new Tileset(url));
  };

  return (
    <div class="flex flex-col h-dvh w-full">
      <div class="flex-0">
        <h1 class="text-xl">Map view</h1>
        <form onSubmit={loadTileset}>
          <input
            class="border"
            type="text"
            name="url"
            placeholder="TileJSON or .pmtiles"
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
          <a href={`/archive/#url=${tileset()?.url}`}>archive inspector</a>
        </form>
      </div>
      <Show
        when={tileset() !== undefined}
        fallback={
          <span>
            <button
              type="button"
              onClick={() => {
                loadSample("https://demo-bucket.protomaps.com/v4.pmtiles");
              }}
            >
              https://demo-bucket.protomaps.com/v4.pmtiles
            </button>
          </span>
        }
      >
        <div class="flex w-full h-full">
          <MapView url={tileset()?.url} />
          <Show when={showMetadata()}>
            <div class="w-1/2">
              <json-viewer data='{"abc":{"def":"geh"}}' />
            </div>
          </Show>
        </div>
      </Show>
    </div>
  );
}

const root = document.getElementById("root");

if (root) {
  render(() => <App />, root);
}
