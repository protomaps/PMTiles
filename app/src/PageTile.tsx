/* @refresh reload */
import "./index.css";
import { VectorTile } from "@mapbox/vector-tile";
import { axisBottom, axisRight } from "d3-axis";
import { path } from "d3-path";
import { scaleLinear } from "d3-scale";
import { type Selection, create, select } from "d3-selection";
import {
  type ZoomBehavior,
  type ZoomTransform,
  zoom as d3zoom,
  zoomIdentity,
} from "d3-zoom";
import Protobuf from "pbf";
import {
  type Accessor,
  type JSX,
  type Setter,
  Show,
  createEffect,
  createMemo,
  createResource,
  createSignal,
  onMount,
} from "solid-js";
import { render } from "solid-js/web";
import { FeatureTable, type InspectableFeature } from "./FeatureTable";
import { ExampleChooser, Frame } from "./Frame";
import { type LayerVisibility, LayersPanel } from "./LayersPanel";
import { type Tileset, tilesetFromString } from "./tileset";
import { colorForIdx, createHash, parseHash, zxyFromHash } from "./utils";

interface Layer {
  name: string;
  features: Feature[];
}

interface Feature {
  path: string;
  type: number;
  id: number | undefined;
  properties: unknown;
  color: string;
  layerName: string;
}

function parseTile(data: ArrayBuffer, vectorLayers: string[]): Layer[] {
  const tile = new VectorTile(new Protobuf(new Uint8Array(data)));
  const layers = [];
  let maxExtent = 0;
  for (const [name, layer] of Object.entries(tile.layers)) {
    if (layer.extent > maxExtent) {
      maxExtent = layer.extent;
    }
    const features: Feature[] = [];
    for (let i = 0; i < layer.length; i++) {
      const feature = layer.feature(i);
      const p = path();
      const geom = feature.loadGeometry();

      if (feature.type === 1) {
        for (const ring of geom) {
          for (const pt of ring) {
            p.rect(pt.x - 15, pt.y - 15, 30, 30);
          }
        }
      } else {
        for (const ring of geom) {
          p.moveTo(ring[0].x, ring[0].y);
          for (let j = 1; j < ring.length; j++) {
            p.lineTo(ring[j].x, ring[j].y);
          }
          if (feature.type === 3) {
            p.closePath();
          }
        }
      }
      features.push({
        path: p.toString(),
        type: feature.type,
        id: feature.id,
        properties: feature.properties,
        layerName: name,
        color: colorForIdx(vectorLayers.indexOf(name)),
      });
    }

    // sort so that points and linestrings are above polygons
    features.sort((a, b) => (a.type > b.type ? -1 : 1));

    layers.push({ name: name, features: features });
  }

  return layers;
}

function layerFeatureCounts(
  parsedTile?: Layer[] | ArrayBuffer,
): Record<string, number> {
  const result: Record<string, number> = {};
  if (!parsedTile) return result;
  if (parsedTile instanceof ArrayBuffer) return result;
  for (const layer of parsedTile) {
    result[layer.name] = layer.features.length;
  }
  return result;
}

function ZoomableTile(props: {
  zxy: Accessor<[number, number, number]>;
  tileset: Accessor<Tileset>;
}) {
  let containerRef: HTMLDivElement | undefined;
  let svg: Selection<SVGSVGElement, unknown, null, undefined>;
  let zoom: ZoomBehavior<SVGSVGElement, unknown>;
  let view: Selection<SVGGElement, unknown, null, undefined>;

  const [layerVisibility, setLayerVisibility] = createSignal<LayerVisibility[]>(
    [],
  );

  const [inspectableFeature, setInspectableFeature] = createSignal<
    InspectableFeature | undefined
  >();
  const [frozen, setFrozen] = createSignal<boolean>(false);

  onMount(() => {
    if (!containerRef) {
      return;
    }
    const height = containerRef.clientHeight;
    const width = containerRef.clientWidth;

    const x = scaleLinear()
      .domain([-1000, 4096 + 1000])
      .range([-1000, 4096 + 1000]);

    const y = scaleLinear()
      .domain([-1000, 4096 + 1000])
      .range([-1000, 4096 + 1000]);

    const xAxis = axisBottom(x)
      .ticks(((width + 2) / (height + 2)) * 10)
      .tickSize(height)
      .tickPadding(8 - height);

    const yAxis = axisRight(y)
      .ticks(((width + 2) / (height + 2)) * 10)
      .tickSize(width)
      .tickPadding(8 - width);

    svg = create("svg")
      .attr("width", width)
      .attr("height", height) as Selection<
      SVGSVGElement,
      unknown,
      null,
      undefined
    >;
    view = svg.append("g");
    const gX = svg.append("g").attr("class", "axis axis--x").call(xAxis);
    const gY = svg.append("g").attr("class", "axis axis--y").call(yAxis);

    function zoomed({ transform }: { transform: ZoomTransform }) {
      view.attr("transform", transform.toString());
      gX.call(xAxis.scale(transform.rescaleX(x)));
      gY.call(yAxis.scale(transform.rescaleY(y)));
    }

    function filter(event: MouseEvent | WheelEvent) {
      event.preventDefault();
      return (!event.ctrlKey || event.type === "wheel") && !event.button;
    }

    zoom = d3zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.01, 20])
      .translateExtent([
        [-1000, -1000],
        [4096 + 1000, 4096 + 1000],
      ])
      .filter(filter)
      .on("zoom", zoomed);

    Object.assign(svg.call(zoom).node() as SVGSVGElement, {});

    svg.call(
      zoom.transform,
      zoomIdentity
        .translate(width / 2, height / 2)
        .scale((height / 4096) * 0.75)
        .translate(-4096 / 2, -4096 / 2),
    );

    const resizeObserver = new ResizeObserver(() => {
      svg.attr("width", containerRef.clientWidth);
      svg.attr("height", containerRef.clientHeight);
    });
    resizeObserver.observe(containerRef);

    const node = svg.node();
    if (node) {
      containerRef.appendChild(node);
    }
  });

  const inputs = createMemo(() => ({
    zxy: props.zxy(),
    tileset: props.tileset(),
  }));

  const [parsedTile] = createResource(inputs, async (i) => {
    const tileset = i.tileset;
    const zxy = i.zxy;
    if (await tileset.isVector()) {
      const data = await tileset.getZxy(zxy[0], zxy[1], zxy[2]);
      if (!data) return;
      const vectorLayers = await props.tileset().getVectorLayers();
      return parseTile(data, vectorLayers);
    }
    return await tileset.getZxy(zxy[0], zxy[1], zxy[2]);
  });

  createEffect(async () => {
    const tileset = props.tileset();
    if (await tileset.isVector()) {
      const vectorLayers = await tileset.getVectorLayers();
      setLayerVisibility(vectorLayers.map((v) => ({ id: v, visible: true })));
    }
  });

  createEffect(async () => {
    view.selectAll("*").remove();
    view
      .append("rect")
      .attr("width", 4096)
      .attr("height", 4096)
      .attr("x", 0)
      .attr("y", 0)
      .attr("fill", "none")
      .attr("class", "tile-border")
      .attr("strokeWidth", "1");

    const tile = parsedTile();
    if (!tile) return;

    if (Array.isArray(tile)) {
      const visibility = layerVisibility();
      const layersToShow = tile.filter((l) => {
        return visibility.find((v) => v.id === l.name && v.visible);
      });
      const layer = view.selectAll("g").data(layersToShow).join("g");

      layer
        .selectAll("path")
        .data((d) => d.features)
        .join("path")
        .attr("d", (f) => f.path)
        .style("opacity", 0.3)
        .attr("fill", (d) => (d.type === 3 || d.type === 1 ? d.color : "none"))
        .attr("stroke", (d) => (d.type === 2 ? d.color : "none"))
        .attr("stroke-width", 6)
        .on("mouseover", function (_e, d) {
          if (frozen()) return;
          if (d.type === 2) {
            select(this).attr("stroke", "white");
          } else {
            select(this).attr("fill", "white");
          }
          setInspectableFeature({
            layerName: d.layerName,
            properties: d.properties,
            type: d.type,
            id: d.id,
          } as InspectableFeature);
        })
        .on("mouseout", function (_e, d) {
          if (frozen()) return;
          if (d.type === 2) {
            select(this).attr("stroke", d.color);
          } else {
            select(this).attr("fill", d.color);
          }
        })
        .on("mousedown", () => {
          setFrozen(!frozen());
        });
    } else {
      const blob = new Blob([tile], { type: "image/webp" });
      const objectUrl = URL.createObjectURL(blob);
      const img = view.append("image");
      img.attr("href", objectUrl).attr("width", 4096).attr("height", 4096);
    }
  });

  return (
    <div class="h-full w-full relative">
      <div class="absolute top-2 right-2">
        <LayersPanel
          layerVisibility={layerVisibility}
          setLayerVisibility={setLayerVisibility}
          layerFeatureCounts={layerFeatureCounts(parsedTile())}
        />
      </div>
      <Show when={inspectableFeature()}>
        {(f) => (
          <div class="absolute bottom-2 right-2">
            <div
              classList={{
                "app-bg": true,
                "app-well": frozen(),
                rounded: true,
                "p-2": true,
                "app-border": true,
              }}
            >
              <FeatureTable features={[f()]} />
            </div>
          </div>
        )}
      </Show>
      <div ref={containerRef} class="h-full cursor-crosshair" />
    </div>
  );
}

function TileView(props: {
  tileset: Accessor<Tileset>;
  zxy: Accessor<[number, number, number] | undefined>;
  setZxy: Setter<[number, number, number] | undefined>;
}) {
  const [neighborsOpen, setNeighborsOpen] = createSignal<boolean>(false);
  const [childrenOpen, setChildrenOpen] = createSignal<boolean>(false);

  const targetTile = (
    z: number,
    x: number,
    y: number,
  ): [number, number, number] | undefined => {
    const current = props.zxy();
    if (!current) return;
    if (z === 0) return [current[0], current[1] + x, current[2] + y];
    if (z === 1)
      return [current[0] + 1, current[1] * 2 + x, current[2] * 2 + y];
    if (z === -1)
      return [
        current[0] - 1,
        Math.floor(current[1] / 2),
        Math.floor(current[2] / 2),
      ];
  };

  const navigate = (z: number, x: number, y: number) => {
    const t = targetTile(z, x, y);
    if (t) props.setZxy(t);
  };

  const canNavigate = (z: number, x: number, y: number) => {
    const t = targetTile(z, x, y);
    if (t) {
      if (t[0] < 0 || t[1] < 0 || t[2] < 0) return false;
      const max = 2 ** t[0] - 1;
      return t[1] <= max && t[2] <= max;
    }
    return false;
  };

  const loadZxy: JSX.EventHandler<HTMLFormElement, Event> = (e) => {
    e.preventDefault();
    const form = e.currentTarget;

    const z = form.elements.namedItem("z") as HTMLInputElement;
    const x = form.elements.namedItem("x") as HTMLInputElement;
    const y = form.elements.namedItem("y") as HTMLInputElement;

    props.setZxy([+z.value, +x.value, +y.value]);
  };

  const NavTile = (props: { navTo: [number, number, number] }) => {
    return (
      <button
        type="button"
        onClick={() => navigate(...props.navTo)}
        classList={{
          border: canNavigate(...props.navTo),
          "hover:bg-purple": canNavigate(...props.navTo),
          "cursor-pointer": canNavigate(...props.navTo),
        }}
        disabled={!canNavigate(...props.navTo)}
      />
    );
  };

  const cleanValue = (
    zxy: [number, number, number] | undefined,
    idx: number,
  ) => {
    if (!zxy) return "";
    return zxy[idx];
  };

  return (
    <div class="flex flex-col h-full w-full">
      <div class="p-2 space-y-2 md:space-y-0 md:space-x-2 flex flex-col md:flex-row justify-start">
        <form
          class="flex flex-row justify-between md:space-x-4"
          onSubmit={loadZxy}
        >
          <label for="z">Z</label>
          <input
            id="z"
            type="number"
            class="app-border w-20"
            value={cleanValue(props.zxy(), 0)}
          />
          <label for="x">X</label>
          <input
            id="x"
            type="number"
            class="app-border w-20"
            value={cleanValue(props.zxy(), 1)}
          />
          <label for="y">Y</label>
          <input
            id="y"
            type="number"
            class="app-border w-20"
            value={cleanValue(props.zxy(), 2)}
          />
          <button
            type="submit"
            class="btn-primary rounded px-4 md:mr-8 pointer-cursor"
          >
            load
          </button>
        </form>
        <div class="flex flex-row justify-between space-x-4">
          <span class="relative">
            <button
              type="button"
              class="rounded btn-secondary px-4 cursor-pointer"
              onClick={() => setNeighborsOpen(!neighborsOpen())}
            >
              neighbors
            </button>
            <Show when={neighborsOpen()}>
              <div class="absolute top-8 left-0 z-[999] w-full flex justify-center">
                <div class="grid grid-cols-3 grid-rows-3 gap-1 w-16 h-16">
                  <NavTile navTo={[0, -1, -1]} />
                  <NavTile navTo={[0, 0, -1]} />
                  <NavTile navTo={[0, 1, -1]} />
                  <NavTile navTo={[0, -1, 0]} />
                  <div />
                  <NavTile navTo={[0, 1, 0]} />
                  <NavTile navTo={[0, -1, 1]} />
                  <NavTile navTo={[0, 0, 1]} />
                  <NavTile navTo={[0, 1, 1]} />
                </div>
              </div>
            </Show>
          </span>
          <span class="relative">
            <button
              type="button"
              class="rounded btn-secondary px-4 cursor-pointer"
              onClick={() => setChildrenOpen(!childrenOpen())}
            >
              children
            </button>
            <Show when={childrenOpen()}>
              <div class="w-full absolute top-8 left-0 flex justify-center">
                <div class="grid grid-cols-2 grid-rows-2 gap-1 w-16 h-16 z-[999]">
                  <NavTile navTo={[1, 0, 0]} />
                  <NavTile navTo={[1, 1, 0]} />
                  <NavTile navTo={[1, 0, 1]} />
                  <NavTile navTo={[1, 1, 1]} />
                </div>
              </div>
            </Show>
          </span>
          <span class="relative">
            <button
              type="button"
              classList={{
                rounded: true,
                "btn-secondary": canNavigate(-1, 0, 0),
                "px-4": true,
              }}
              onClick={() => navigate(-1, 0, 0)}
              disabled={!canNavigate(-1, 0, 0)}
            >
              parent
            </button>
          </span>
        </div>
      </div>
      <Show
        when={props.zxy()}
        fallback={<div class="p-4">Enter a tile z/x/y</div>}
      >
        {(z) => (
          <div class="flex flex-1 w-full h-full overflow-hidden">
            <ZoomableTile zxy={z} tileset={props.tileset} />
          </div>
        )}
      </Show>
    </div>
  );
}

function PageTile() {
  const hash = parseHash(location.hash);
  const [tileset, setTileset] = createSignal<Tileset | undefined>(
    hash.url ? tilesetFromString(decodeURIComponent(hash.url)) : undefined,
  );
  const [zxy, setZxy] = createSignal<[number, number, number] | undefined>(
    hash.zxy ? zxyFromHash(hash.zxy) : undefined,
  );

  createEffect(() => {
    const t = tileset();
    const zxyVal = zxy();
    const stateUrl = t?.getStateUrl();
    location.hash = createHash(location.hash, {
      url: stateUrl ? encodeURIComponent(stateUrl) : undefined,
      zxy: zxyVal ? zxyVal.join("/") : undefined,
    });
  });

  return (
    <Frame tileset={tileset} setTileset={setTileset} page="tile">
      <Show
        when={tileset()}
        fallback={<ExampleChooser setTileset={setTileset} />}
      >
        {(t) => <TileView tileset={t} zxy={zxy} setZxy={setZxy} />}
      </Show>
    </Frame>
  );
}

const root = document.getElementById("root");

if (root) {
  render(() => <PageTile />, root);
}
