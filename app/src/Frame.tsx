import { type JSX, type Setter } from "solid-js";

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
            class="block p-2 flex justify-start flex-col hover:bg-indigo-500 w-full"
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

function LinkTab(props: {page: string, tileset?: Tileset}) {
  return <a
    class="bg-gray-700 p-2"
    href={`/${props.page === "map" ? "" : props.page + "/"}#url=${props.tileset?.getStateUrl()}`}
  >
    {props.page}
  </a>
}

export function Frame(props: {
  tileset?: Tileset;
  setTileset: Setter<Tileset | undefined>;
  children: JSX.Element;
  page: string;
}) {
  const loadTileset: JSX.EventHandler<HTMLFormElement, Event> = (event) => {
    event.preventDefault();
    const formData = new FormData(event.target as HTMLFormElement);
    const urlValue = formData.get("url");
    if (typeof urlValue === "string") {
      props.setTileset(tilesetFromString(urlValue));
    }
  };

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

  return (
    <div
      class="flex flex-col h-dvh w-full dark:bg-gray-900 dark:text-white"
      ondragover={dragover}
      ondrop={drop}
    >
      <div class="flex-0 flex items-center">
        <div class="flex items-center p-2 flex-grow">
          <Switch>
            <Match when={props.page === "archive"}>
              <LinkTab page="map" tileset={props.tileset}/>
            </Match>
            <Match when={props.page === "tile"}>
              <LinkTab page="map" tileset={props.tileset}/>
              <LinkTab page="archive" tileset={props.tileset}/>
            </Match>
          </Switch>
          <h1 class="text-xl">PMTiles {props.page} viewer</h1>
          <form onSubmit={loadTileset}>
            <input
              class="border w-100 mx-2 px-2"
              type="text"
              name="url"
              placeholder="TileJSON or .pmtiles"
              value={props.tileset?.getStateUrl() || ""}
            />
            <button class="px-4 mx-2 bg-indigo-500 rounded" type="submit">
              load
            </button>
            <button class="px-4 mx-2 bg-indigo-500 rounded" type="submit">
              clear
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
        <Switch>
          <Match when={props.page === "map"}>
            <LinkTab page="archive" tileset={props.tileset}/>
            <LinkTab page="tile" tileset={props.tileset}/>
          </Match>
          <Match when={props.page === "archive"}>
            <LinkTab page="tile" tileset={props.tileset}/>
          </Match>
        </Switch>
      </div>
      {props.children}
    </div>
  );
}
