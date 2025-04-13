/* @refresh reload */
import { render } from "solid-js/web";
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
  Show,
  createEffect,
  createResource,
  createSignal,
  onMount,
} from "solid-js";
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
            p.rect(pt.x - 4, pt.y - 4, 8, 8);
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
  zxy: [number, number, number];
  tileset: Tileset;
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

    // const width = 800;
    // const height = 300;

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
    view
      .append("rect")
      .attr("width", 4096)
      .attr("height", 4096)
      .attr("x", 0)
      .attr("y", 0)
      .attr("fill", "none")
      .attr("strokeWidth", "1")
      .attr("stroke", "blue");
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

  const [parsedTile] = createResource(async () => {
    const zxy = props.zxy;
    const tileset = props.tileset;
    if (await tileset.isVector()) {
      const data = await tileset.getZxy(zxy[0], zxy[1], zxy[2]);
      if (!data) return; // TODO show error
      const vectorLayers = await props.tileset.getVectorLayers();
      return parseTile(data, vectorLayers);
    }
    return await tileset.getZxy(zxy[0], zxy[1], zxy[2]);
  });

  onMount(async () => {
    const vectorLayers = await props.tileset.getVectorLayers();
    setLayerVisibility(vectorLayers.map((v) => ({ id: v, visible: true })));
  });

  createEffect(async () => {
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
        .attr("fill", (d) => (d.type === 3 ? d.color : "none"))
        .attr("stroke", (d) => (d.type === 2 ? d.color : "none"))
        .attr("strokeWidth", 1)
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
                "bg-white": true,
                "dark:bg-gray-900": !frozen(),
                "dark:bg-gray-800": frozen(),
                rounded: true,
                "p-4": true,
                border: true,
                "border-gray-700": true,
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

function TileView(props: { tileset: Tileset }) {
  const hash = parseHash(location.hash);
  const [zxy] = createSignal<[number, number, number] | undefined>(
    hash.zxy ? zxyFromHash(hash.zxy) : [0, 0, 0],
  );

  return (
    <div class="flex flex-col h-full w-full dark:bg-gray-900 dark:text-white">
      <Show when={zxy()} fallback={<span>fallback</span>}>
        {(z) => (
          <>
            <div class="flex-none p-4">{z().join(", ")}</div>
            <div class="flex flex-1 w-full h-full overflow-hidden">
              <ZoomableTile zxy={z()} tileset={props.tileset} />
            </div>
          </>
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

  createEffect(() => {
    const t = tileset();
    if (t) {
      const stateUrl = t.getStateUrl();
      location.hash = createHash(location.hash, {
        url: stateUrl ? encodeURIComponent(stateUrl) : undefined,
      });
    }
  });

  return (
    <Frame tileset={tileset} setTileset={setTileset} page="tile">
      <Show
        when={tileset()}
        fallback={<ExampleChooser setTileset={setTileset} />}
      >
        {(t) => <TileView tileset={t()} />}
      </Show>
    </Frame>
  );
}

const root = document.getElementById("root");

if (root) {
  render(() => <PageTile />, root);
}
