/* @refresh reload */
import { render } from "solid-js/web";
import "./index.css";

import { VectorTile } from "@mapbox/vector-tile";
import { axisBottom, axisRight } from "d3-axis";
import { path } from "d3-path";
import { scaleLinear } from "d3-scale";
import { type Selection, create } from "d3-selection";
import { type ZoomBehavior, zoom as d3zoom, zoomIdentity } from "d3-zoom";
import Protobuf from "pbf";
import {
  type JSX,
  Show,
  createEffect,
  createResource,
  createSignal,
  onMount,
} from "solid-js";
import { LayersPanel } from "./LayersPanel";
import { type Tileset, tilesetFromString } from "./tileset";
import { GIT_SHA, createHash, parseHash, zxyFromHash } from "./utils";

interface Feature {
  path: string;
  type: number;
  id: number | undefined;
  properties: unknown;
}

function parseTile(data: ArrayBuffer) {
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
      });
    }

    layers.push({ name: name, features: features });
  }

  return layers;
}

function layerFeatureCounts(parsedTile?: VectorTile): Record<string, number> {
  const result: Record<string, number> = {};
  if (!parsedTile) return result;
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
  let svg: Selection<SVGSVGElement, undefined, null, undefined>;
  let zoom: ZoomBehavior<Element, unknown>;
  let view: Selection<SVGSVGElement, undefined, null, undefined>;

  const [activeLayers, setActiveLayers] = createSignal<string[] | undefined>();

  onMount(() => {
    const height = containerRef.clientHeight;
    const width = containerRef.clientWidth;

    if (!containerRef) {
      return;
    }

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

    svg = create("svg").attr("width", width).attr("height", height);
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

    function zoomed({ transform }: { transform: any }) {
      view.attr("transform", transform);
      gX.call(xAxis.scale(transform.rescaleX(x)));
      gY.call(yAxis.scale(transform.rescaleY(y)));
    }

    function filter(event: MouseEvent | WheelEvent) {
      event.preventDefault();
      return (!event.ctrlKey || event.type === "wheel") && !event.button;
    }

    zoom = d3zoom()
      .scaleExtent([0.01, 20])
      .translateExtent([
        [-1000, -1000],
        [4096 + 1000, 4096 + 1000],
      ])
      .filter(filter)
      .on("zoom", zoomed);

    Object.assign(svg.call(zoom as any).node() as SVGSVGElement, {});

    svg.call(
      zoom.transform,
      zoomIdentity
        .translate(width / 2, height / 2)
        .scale((height / 4096) * 0.75)
        .translate(-4096 / 2, -4096 / 2),
    );

    const resizeObserver = new ResizeObserver(() => {
      svg.attr("width", containerRef.clientWidth);
      svg.attr("height", containerRef.contentHeight);
    });
    resizeObserver.observe(containerRef);

    const node = svg.node();
    if (node) {
      containerRef.appendChild(node);
    }
  });

  const reset = () => {
    svg
      .transition()
      .duration(750)
      .call(zoom.transform as any, zoomIdentity);
  };

  const [parsedTile] = createResource(async () => {
    const zxy = props.zxy;
    const tileset = props.tileset;
    const data = await tileset.getZxy(zxy[0], zxy[1], zxy[2]);
    if (!data) return; // TODO show error
    return parseTile(data);
  });

  createEffect(async () => {
    const tile = parsedTile();
    if (!tile) return;
    const layer = view
      .selectAll("g")
      .data(tile)
      .join("g")
      .attr("stroke", "blue");
    layer
      .selectAll("path")
      .data((d) => d.features)
      .join("path")
      .attr("d", (f) => f.path)
      .style("opacity", 1)
      .attr("fill", "none")
      .attr("strokeWidth", 1)
      .on("mouseover", (_e, d) => {
        console.log(d);
      });
  });

  return (
    <div class="h-full w-full">
      <button type="button" onClick={reset}>
        reset
      </button>
      <div class="absolute right-8 flex">
        <LayersPanel
          tileset={props.tileset}
          setActiveLayers={setActiveLayers}
          layerFeatureCounts={layerFeatureCounts(parsedTile())}
        />
      </div>
      <div ref={containerRef} class="h-full" />
    </div>
  );
}

// TODO error display
function TileView() {
  const hash = parseHash(location.hash);
  const [tileset, setTileset] = createSignal<Tileset | undefined>(
    hash.url ? tilesetFromString(decodeURIComponent(hash.url)) : undefined,
  );
  const [zxy] = createSignal<[number, number, number] | undefined>(
    hash.zxy ? zxyFromHash(hash.zxy) : [0, 0, 0],
  );

  createEffect(() => {
    const t = tileset();
    if (t) {
      location.hash = createHash(location.hash, {
        url: encodeURIComponent(t.getStateUrl()),
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

  return (
    <div class="flex flex-col h-dvh w-full dark:bg-gray-900 dark:text-white">
      <div class="flex-0">
        <h1 class="text-xl">Tile inspector</h1>
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
          left up right down parent child
          {GIT_SHA}
          {zxy}
        </form>
      </div>
      <Show when={tileset() && zxy()} fallback={<span>fallback</span>}>
        <div class="flex w-full h-full">
          <ZoomableTile zxy={zxy()!} tileset={tileset()!} />
        </div>
      </Show>
    </div>
  );
}

const root = document.getElementById("root");

if (root) {
  render(() => <TileView />, root);
}
