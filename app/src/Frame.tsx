import {
  type Accessor,
  type JSX,
  type Setter,
  Show,
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

  const onChangeFileInput = (
    event: Event & { currentTarget: HTMLInputElement },
  ) => {
    const file = event.currentTarget.files?.[0];
    if (file) {
      props.setTileset(tilesetFromFile(file));
    }
  };

  return (
    <div class="h-full flex items-center justify-center p-4">
      <div>
        <div class="mb-2 app-text-light">Load an example:</div>
        <div class="app-border divide-y">
          <button
            class="block p-2 flex text-left flex-col hover:bg-slate dark:hover:bg-purple w-full cursor-pointer"
            type="button"
            onClick={() => {
              loadSample("https://demo-bucket.protomaps.com/v4.pmtiles");
            }}
          >
            <div>v4.pmtiles</div>
            <div class="text-xs app-text-light">
              vector basemap, Protomaps daily build channel (OpenStreetMap data)
            </div>
          </button>

          <button
            class="block p-2 flex text-left flex-col hover:bg-slate dark:hover:bg-purple w-full cursor-pointer"
            type="button"
            onClick={() => {
              loadSample("https://air.mtn.tw/flowers.pmtiles");
            }}
          >
            <div>flowers.pmtiles</div>
            <div class="text-xs app-text-light">
              raster overlay, aerial orthomosaic
            </div>
          </button>
          <button
            class="block p-2 flex text-left flex-col hover:bg-slate dark:hover:bg-purple app-bg-hover w-full cursor-pointer"
            type="button"
            onClick={() => {
              loadSample(
                "https://r2-public.protomaps.com/protomaps-sample-datasets/tilezen.pmtiles",
              );
            }}
          >
            <div>tilezen.pmtiles</div>
            <div class="text-xs app-text-light">
              vector basemap, 2019 Mapzen Tiles (legacy)
            </div>
          </button>
        </div>
        <input
          class="text-left mt-4 px-4 py-2 btn-primary cursor-pointer rounded w-full"
          type="file"
          onChange={onChangeFileInput}
        />
        <div class="mt-2 app-text-light">Drag and drop a local file here</div>
      </div>
    </div>
  );
};

function LinkTab(props: {
  page: string;
  tileset: Accessor<Tileset | undefined>;
  selected: boolean;
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
        "font-bold": props.selected,
        "py-2": true,
        "px-4": true,
        underline: !props.selected,
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
  pmtilesOnly?: boolean;
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
          setErrorMessage(e.message);
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
      class="flex flex-col h-dvh w-full app-bg"
      ondragover={dragover}
      ondrop={drop}
    >
      <div class="flex-none flex items-center px-4 md:px-0 pt-4 md:pt-0 flex-col md:flex-row">
        <div class="flex items-center flex-grow flex-1">
          <h1 class="hidden md:inline text-xl mx-5">{pageTitle}</h1>
          <form class="flex flex-1 items-center" onSubmit={loadTileset}>
            <span class="relative flex flex-1 items-center app-border">
              <input
                class="px-2 flex-1"
                type="text"
                name="url"
                placeholder={`${props.pmtilesOnly ? "" : "TileJSON or "}.pmtiles`}
                value={props.tileset()?.getStateUrl() || ""}
              />
              <Show when={props.tileset()}>
                <button
                  type="button"
                  class="mr-2 text-sm px-2 btn-secondary cursor-pointer"
                  onClick={() => props.setTileset(undefined)}
                >
                  clear
                </button>
              </Show>
            </span>
            <button class="px-4 ml-2 btn-primary cursor-pointer" type="submit">
              load
            </button>
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
        <div class="flex">
          <LinkTab
            page="map"
            selected={props.page === "map"}
            tileset={props.tileset}
          />
          <LinkTab
            page="archive"
            selected={props.page === "archive"}
            tileset={props.tileset}
          />
          <LinkTab
            page="tile"
            selected={props.page === "tile"}
            tileset={props.tileset}
          />
        </div>
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
