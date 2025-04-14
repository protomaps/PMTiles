import {
  type Accessor,
  type JSX,
  Match,
  type Setter,
  Show,
  Switch,
  createEffect,
  createMemo,
  createSignal,
} from "solid-js";

import { type Tileset, tilesetFromFile, tilesetFromString } from "./tileset";
import { GIT_SHA } from "./utils";

export const ExampleChooser = (props: {
  setTileset: Setter<Tileset | undefined>;
}) => {
  const loadSample = (url: string) => {
    props.setTileset(tilesetFromString(url));
  };

  return (
    <div class="h-full flex items-center justify-center">
      <div>
        Load an example:
        <div>
          <button
            class="block p-2 flex justify-start flex-col hover:bg-indigo-500 w-full border border-gray-500"
            type="button"
            onClick={() => {
              loadSample("https://demo-bucket.protomaps.com/v4.pmtiles");
            }}
          >
            <div>demo-bucket.protomaps.com/v4.pmtiles</div>
            <div class="text-xs">
              vector, Protomaps daily build channel (OpenStreetMap data)
            </div>
          </button>

          <button
            class="block p-2 flex justify-start flex-col hover:bg-indigo-500 w-full border border-gray-500"
            type="button"
            onClick={() => {
              loadSample("https://air.mtn.tw/flowers.pmtiles");
            }}
          >
            <div>air.mtn.tw/flowers.pmtiles</div>
            <div class="text-xs">raster, aerial orthomosaic</div>
          </button>
          <button
            class="block p-2 flex justify-start flex-col hover:bg-indigo-500 w-full border border-gray-500"
            type="button"
            onClick={() => {
              loadSample(
                "https://r2-public.protomaps.com/protomaps-sample-datasets/tilezen.pmtiles",
              );
            }}
          >
            <div>
              r2-public.protomaps.com/protomaps-sample-datasets/tilezen.pmtiles
            </div>
            <div class="text-xs">vector, 2019 Mapzen Tiles (legacy)</div>
          </button>
        </div>
        or drag and drop a local file here
      </div>
    </div>
  );
};

function LinkTab(props: {
  page: string;
  tileset: Accessor<Tileset | undefined>;
  lighter?: boolean;
}) {
  const fragment = createMemo(() => {
    const t = props.tileset();
    if (t) {
      const stateUrl = t.getStateUrl();
      if (stateUrl) return `#url=${stateUrl}`;
    }
    return "";
  });

  return (
    <a
      classList={{
        "hover:bg-gray-400": true,
        "bg-gray-700": !props.lighter,
        "bg-gray-500": props.lighter,
        "py-2": true,
        "px-4": true,
      }}
      href={`/${props.page === "map" ? "" : `${props.page}/`}${fragment()}`}
    >
      {props.page}
    </a>
  );
}

export function Frame(props: {
  tileset: Accessor<Tileset | undefined>;
  setTileset: Setter<Tileset | undefined>;
  children: JSX.Element;
  page: string;
}) {
  const [errorMessage, setErrorMessage] = createSignal<string | undefined>();
  const [activeDrag, setActiveDrag] = createSignal<boolean>(false);

  const setTilesetHandlingErrors = (url: string) => {
    try {
      props.setTileset(tilesetFromString(url));
    } catch (e) {
      if (e instanceof Error) {
        setErrorMessage(e.message);
      }
    }
  };

  const loadTileset: JSX.EventHandler<HTMLFormElement, Event> = (event) => {
    setErrorMessage(undefined);
    event.preventDefault();
    const formData = new FormData(event.target as HTMLFormElement);
    const urlValue = formData.get("url");
    if (typeof urlValue === "string" && urlValue.length > 0) {
      setTilesetHandlingErrors(urlValue);
    }
  };

  createEffect(async () => {
    const t = props.tileset();
    if (t) {
      try {
        await t.test();
      } catch (e) {
        if (e instanceof Error) {
          setErrorMessage(e.message); // TODO HTTP error codes
        }
      }
    }
  });

  const drop: JSX.EventHandler<HTMLDivElement, DragEvent> = (event) => {
    event.preventDefault();
    setActiveDrag(false);
    if (event.dataTransfer) {
      props.setTileset(tilesetFromFile(event.dataTransfer.files[0]));
    }
  };

  const dragover: JSX.EventHandler<HTMLDivElement, Event> = (event) => {
    event.preventDefault();
    setActiveDrag(true);
    return false;
  };

  let pageTitle = "PMTiles viewer";
  if (props.page === "archive") {
    pageTitle = "PMTiles archive inspector";
  } else if (props.page === "tile") {
    pageTitle = "PMTiles tile inspector";
  }

  return (
    <div
      class="flex flex-col h-dvh w-full dark:bg-gray-900 dark:text-white"
      ondragover={dragover}
      ondrop={drop}
    >
      <div class="flex-none flex items-center">
        <div class="flex items-center flex-grow flex-1">
          <Switch>
            <Match when={props.page === "archive"}>
              <LinkTab page="map" tileset={props.tileset} />
            </Match>
            <Match when={props.page === "tile"}>
              <LinkTab page="map" tileset={props.tileset} lighter={true} />
              <LinkTab page="archive" tileset={props.tileset} />
            </Match>
          </Switch>
          <h1 class="hidden md:inline text-xl mx-5">{pageTitle}</h1>
          <form class="flex flex-1 items-center" onSubmit={loadTileset}>
            <span class="relative flex flex-1 items-center">
              <input
                class="border mx-2 px-2 flex-1"
                type="text"
                name="url"
                placeholder="TileJSON or .pmtiles"
                value={props.tileset()?.getStateUrl() || ""}
              />
              <Show when={props.tileset()}>
                <button
                  type="button"
                  class="absolute right-4 bg-indigo-800 rounded text-sm px-2"
                  onClick={() => props.setTileset(undefined)}
                >
                  clear
                </button>
              </Show>
            </span>
            <button class="px-4 ml-2 bg-indigo-500 rounded" type="submit">
              load
            </button>
            <a
              href="https://github.com/protomaps/PMTiles/issues/555"
              target="_blank"
              rel="noreferrer"
              class="hidden md:inline text-xs rounded bg-yellow-500 text-black mx-4 px-2"
            >
              beta feedback
            </a>
            <a
              href="https://github.com/protomaps/PMTiles"
              target="_blank"
              rel="noreferrer"
              class="hidden md:inline text-xs mx-4"
            >
              @{GIT_SHA}
            </a>
          </form>
        </div>
        <Switch>
          <Match when={props.page === "map"}>
            <LinkTab page="archive" tileset={props.tileset} />
            <LinkTab page="tile" tileset={props.tileset} lighter={true} />
          </Match>
          <Match when={props.page === "archive"}>
            <LinkTab page="tile" tileset={props.tileset} />
          </Match>
        </Switch>
      </div>
      <Show when={errorMessage()}>
        <div class="bg-red-900 px-2 py-3 flex justify-between">
          <span>{errorMessage()}</span>
          <span>
            <button type="button" onClick={() => setErrorMessage(undefined)}>
              close
            </button>
          </span>
        </div>
      </Show>
      <div
        classList={{
          "flex-1": true,
          "overflow-auto": true,
          "bg-gray-600": activeDrag(),
        }}
      >
        {props.children}
      </div>
    </div>
  );
}
