/* @refresh reload */
import "maplibre-gl/dist/maplibre-gl.css";
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
  type Accessor,
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
  tileset: Accessor<Tileset>;
  showMetadata: Accessor<boolean>;
  setShowMetadata: Setter<boolean>;
  showTileBoundaries: Accessor<boolean>;
  setShowTileBoundaries: Setter<boolean>;
  inspectFeatures: Accessor<boolean>;
  setInspectFeatures: Setter<boolean>;
  mapHashPassed: boolean;
}) {
  let mapContainer: HTMLDivElement | undefined;
  let hiddenRef: HTMLDivElement | undefined;
  const [zoom, setZoom] = createSignal<number>(0);
  const [layerVisibility, setLayerVisibility] = createSignal<LayerVisibility[]>(
    [],
  );
  const [hoveredFeatures, setHoveredFeatures] = createSignal<
    MapGeoJSONFeature[]
  >([]);
  const [basemap, setBasemap] = createSignal<boolean>(false);
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
  let initialLoad = true;

  const roundZoom = () => {
    map.zoomTo(Math.round(map.getZoom()));
  };

  const fitToBounds = async () => {
    const bounds = await props.tileset().getBounds();
    map.fitBounds(
      [
        [bounds[0], bounds[1]],
        [bounds[2], bounds[3]],
      ],
      { animate: false },
    );
  };

  const removeTileset = () => {
    for (const layer of map.getStyle().layers) {
      if ("source" in layer && layer.source === "tileset") {
        map.removeLayer(layer.id);
      }
    }
    map.removeSource("tileset");
  };

  const addTileset = async (tileset: Tileset) => {
    const archiveForProtocol = tileset.archiveForProtocol();
    if (archiveForProtocol) {
      protocol.add(archiveForProtocol);
    }
    let flavor = "white";
    if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
      flavor = "black";
    }
    if (await tileset.isOverlay()) {
      setBasemap(true);
    }

    if (await tileset.isVector()) {
      map.addSource("tileset", {
        type: "vector",
        url: tileset.getMaplibreSourceUrl(),
      });
      const vectorLayers = await tileset.getVectorLayers();
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
            "circle-radius": 3,
            "circle-stroke-color": "white",
            "circle-stroke-width": [
              "case",
              ["boolean", ["feature-state", "hover"], false],
              3,
              0,
            ],
          },
          filter: ["==", ["geometry-type"], "Point"],
        });
      }
      for (const [i, vectorLayer] of vectorLayers.entries()) {
        map.addLayer({
          id: `tileset_line_label_${vectorLayer}`,
          type: "symbol",
          source: "tileset",
          "source-layer": vectorLayer,
          layout: {
            "text-field": ["get", "name"],
            "text-font": ["Noto Sans Regular"],
            "text-size": 10,
            "symbol-placement": "line",
          },
          paint: {
            "text-color": colorForIdx(i),
            "text-halo-color": flavor,
            "text-halo-width": 2,
          },
          filter: ["==", ["geometry-type"], "LineString"],
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
            "text-offset": [0, -1],
          },
          paint: {
            "text-color": colorForIdx(i),
            "text-halo-color": flavor,
            "text-halo-width": 2,
          },
          filter: ["==", ["geometry-type"], "Point"],
        });
      }
    } else {
      map.addSource("tileset", {
        type: "raster",
        url: tileset.getMaplibreSourceUrl(),
      });
      map.addLayer({
        source: "tileset",
        id: "tileset_raster",
        type: "raster",
      });
    }
  };

  createEffect(() => {
    const tileset = props.tileset();
    if (initialLoad) {
      initialLoad = false;
      return;
    }
    removeTileset();
    addTileset(tileset);
  });

  createEffect(() => {
    const visibility = basemap() ? "visible" : "none";
    if (map) {
      for (const layer of map.getStyle().layers) {
        if ("source" in layer && layer.source === "basemap") {
          map.setLayoutProperty(layer.id, "visibility", visibility);
        }
      }
    }
  });

  createEffect(() => {
    const show = props.showTileBoundaries();
    if (map) {
      map.showTileBoundaries = show;
    }
  });

  createEffect(() => {
    if (props.inspectFeatures()) {
      setFrozen(false);
    } else {
      for (const hoveredFeature of hoveredFeatures()) {
        map.setFeatureState(hoveredFeature, { hover: false });
      }
      popup.remove();
    }
  });

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

  onMount(async () => {
    if (!mapContainer) {
      console.error("Could not mount map element");
      return;
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
        layers: layers("basemap", namedFlavor(flavor), { lang: "en" }).map(
          (l) => {
            if (!("layout" in l)) {
              l.layout = {};
            }
            if (l.layout) l.layout.visibility = "none";
            return l;
          },
        ),
      },
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
      if (!props.inspectFeatures()) {
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
      const maxZoom = await props.tileset().getMaxZoom();
      const z = Math.max(0, Math.min(maxZoom, Math.floor(currentZoom)));
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
                class="block text-xs btn-primary mt-2 text-center"
                target="_blank"
                rel="noreferrer"
                href={tileInspectUrl(props.tileset().getStateUrl(), [
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
      await addTileset(props.tileset());
      map.resize();
    });
  });

  return (
    <div class="flex flex-col md:flex-row w-full h-full">
      <div class="flex-1 flex flex-col">
        <div class="flex-none p-4 flex justify-between text-xs md:text-base space-x-2">
          <button
            class="px-4 btn-primary cursor-pointer"
            type="button"
            onClick={fitToBounds}
          >
            fit to bounds
          </button>
          <span class="app-border rounded px-2 flex items-center">
            <input
              class="mr-1"
              id="inspectFeatures"
              checked={props.inspectFeatures()}
              type="checkbox"
              onChange={() => {
                props.setInspectFeatures(!props.inspectFeatures());
              }}
            />
            <label for="inspectFeatures">Inspect features</label>
          </span>
          <span class="app-border rounded px-2 flex items-center">
            <input
              class="mr-1"
              id="showTileBoundaries"
              checked={props.showTileBoundaries()}
              type="checkbox"
              onChange={() => {
                props.setShowTileBoundaries(!props.showTileBoundaries());
              }}
            />
            <label for="showTileBoundaries">Show tile bounds</label>
          </span>
          <button
            class="px-4 py-1 btn-secondary cursor-pointer"
            onClick={() => {
              props.setShowMetadata(!props.showMetadata());
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
              inspectFeatures: props.inspectFeatures(),
              frozen: frozen(),
            }}
          />
          <div class="hidden" ref={hiddenRef} />
          <div class="absolute right-2 top-2 z-0">
            <LayersPanel
              layerVisibility={layerVisibility}
              setLayerVisibility={setLayerVisibility}
              basemapOption
              basemap={basemap}
              setBasemap={setBasemap}
            />
          </div>
          <div class="absolute left-2 bottom-2">
            <button
              type="button"
              class="flex items-center rounded border app-bg app-border cursor-pointer"
              onClick={roundZoom}
            >
              <span class="app-well px-1 rounded-l">Z</span>
              <span class="px-2 text-base rounded-r-md rounded-r">
                {zoom().toFixed(2)}
              </span>
            </button>
          </div>
        </div>
      </div>
      <Show when={props.showMetadata()}>
        <div class="md:w-1/2 z-[999] app-bg">
          <JsonView tileset={props.tileset} />
        </div>
      </Show>
    </div>
  );
}

const JsonView = (props: { tileset: Accessor<Tileset> }) => {
  const [data] = createResource(async () => {
    return await props.tileset().getMetadata();
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
  const [showTileBoundaries, setShowTileBoundaries] = createSignal<boolean>(
    hash.showTileBoundaries === "true",
  );
  const [inspectFeatures, setInspectFeatures] = createSignal<boolean>(
    hash.inspectFeatures === "true",
  );

  createEffect(() => {
    const t = tileset();
    const stateUrl = t?.getStateUrl();
    location.hash = createHash(location.hash, {
      url: stateUrl ? encodeURIComponent(stateUrl) : undefined,
      showMetadata: showMetadata() ? "true" : undefined,
      showTileBoundaries: showTileBoundaries() ? "true" : undefined,
      inspectFeatures: inspectFeatures() ? "true" : undefined,
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
            tileset={t}
            showMetadata={showMetadata}
            setShowMetadata={setShowMetadata}
            showTileBoundaries={showTileBoundaries}
            setShowTileBoundaries={setShowTileBoundaries}
            inspectFeatures={inspectFeatures}
            setInspectFeatures={setInspectFeatures}
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
