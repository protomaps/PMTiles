/* @refresh reload */
import { render } from "solid-js/web";
import "./index.css";
import { Show, createSignal, createEffect, onMount, type JSX } from "solid-js";
import { Map as MaplibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { default as layers } from "protomaps-themes-base";
import { createHash, parseHash } from "./utils";

class Tileset {
  url: string;

  constructor(url: string) {
    console.log("tileset init", url);
    this.url = url;
  }
}

function Map() {
  let mapContainer: HTMLDivElement | undefined;

  onMount(() => {
    if (!mapContainer) {
      console.error("Could not mount map element");
      return;
    }

    new MaplibreMap({
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
  });

  return (
    <div class="flex-1 flex flex-col">
      <div class="flex-0">
        <button class="px-4" type="button">
          fit to bounds
        </button>
        <button class="px-4" type="button">
          show metadata
        </button>
        zoom level: 1
      </div>
      <div ref={mapContainer} class="h-full flex-1" />
    </div>
  );
}

// url parameters: maplibre hash + metadata + url
function MapView() {
  const hash = parseHash(location.hash);
  const [tileset, setTileset] = createSignal<Tileset | undefined>(
    hash.url ? new Tileset(hash.url) : undefined,
  );

  createEffect(() => {
    let t = tileset();
    if (t) {
      location.hash = createHash(location.hash, { url: t.url });
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
          ></input>
          <button class="px-4 bg-indigo-500" type="submit">
            load
          </button>
        </form>
      </div>
      <Show
        when={tileset() !== undefined}
        fallback={
          <span>
            <span
              onClick={() => {
                loadSample("https://demo-bucket.protomaps.com/v4.pmtiles");
              }}
            >
              https://demo-bucket.protomaps.com/v4.pmtiles
            </span>
          </span>
        }
      >
        <Map />
      </Show>
    </div>
  );
}

const root = document.getElementById("root");

if (root) {
  render(() => <MapView />, root);
}
