import {
  type JSX,
  type Setter,
  type Accessor,
  createEffect,
  createSignal,
  Match,
  Switch,
  Show,
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
        Load a sample .pmtiles:
        <div>
          <button
            class="block p-2 flex justify-start flex-col hover:bg-indigo-500 w-full border border-gray-500"
            type="button"
            onClick={() => {
              loadSample("https://demo-bucket.protomaps.com/v4.pmtiles");
            }}
          >
            <div>https://demo-bucket.protomaps.com/v4.pmtiles</div>
            <div class="text-xs">vector, global OpenStreetMap data</div>
          </button>

          <button
            class="block p-2 flex justify-start flex-col hover:bg-indigo-500 w-full border border-gray-500"
            type="button"
            onClick={() => {
              loadSample("https://air.mtn.tw/flowers.pmtiles");
            }}
          >
            <div>https://air.mtn.tw/flowers.pmtiles</div>
            <div class="text-xs">raster, aerial orthomosaic (CC0)</div>
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
  let fragment = "";
  const t = props.tileset();
  if (t) {
    fragment = `#url=${t.getStateUrl()}`;
  }

  return (
    <a
      classList={{
        "bg-gray-700": !props.lighter,
        "bg-gray-500": props.lighter,
        "py-2": true,
        "px-4": true,
      }}
      href={`/${props.page === "map" ? "" : props.page + "/"}${fragment}`}
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
        await t.getHeader();
      } catch (e) {
        if (e instanceof Error) {
          setErrorMessage(e.message); // TODO HTTP error codes
        }
      }
    }
  });

  const drop: JSX.EventHandler<HTMLDivElement, DragEvent> = (event) => {
    event.preventDefault();
    if (event.dataTransfer) {
      props.setTileset(tilesetFromFile(event.dataTransfer.files[0]));
    }
  };

  const dragover: JSX.EventHandler<HTMLDivElement, Event> = (event) => {
    event.preventDefault();
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
      <div class="flex-0 flex items-center">
        <div class="flex items-center flex-grow">
          <Switch>
            <Match when={props.page === "archive"}>
              <LinkTab page="map" tileset={props.tileset} />
            </Match>
            <Match when={props.page === "tile"}>
              <LinkTab page="map" tileset={props.tileset} lighter={true} />
              <LinkTab page="archive" tileset={props.tileset} />
            </Match>
          </Switch>
          <h1 class="text-xl mx-5">{pageTitle}</h1>
          <form onSubmit={loadTileset}>
            <input
              class="border w-120 mx-2 px-2"
              type="text"
              name="url"
              placeholder="TileJSON or .pmtiles"
              value={props.tileset()?.getStateUrl() || ""}
            />
            <button class="mx-2" onClick={() => props.setTileset(undefined)}>
              X
            </button>
            <button class="px-4 mx-2 bg-indigo-500 rounded" type="submit">
              load
            </button>
            <a
              href="https://github.com/protomaps/PMTiles"
              target="_blank"
              rel="noreferrer"
              class="text-xs"
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
        <div class="bg-red-900 px-2 py-3">{errorMessage()}</div>
      </Show>
      <div class="flex-1 overflow-auto">{props.children}</div>
    </div>
  );
}
