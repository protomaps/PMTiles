/* @refresh reload */
import { render } from "solid-js/web";
import "./index.css";

import { axisBottom, axisRight } from "d3-axis";
import { scaleLinear } from "d3-scale";
import { type Selection, create } from "d3-selection";
import { type ZoomBehavior, zoom as d3zoom, zoomIdentity } from "d3-zoom";
import { type JSX, Show, createEffect, createSignal, onMount } from "solid-js";
import { Tileset } from "./tileset";
import { createHash, parseHash } from "./utils";

function ZoomableTile() {
  let containerRef: HTMLDivElement | undefined;
  let svg: Selection<SVGSVGElement, undefined, null, undefined>;
  let zoom: ZoomBehavior<Element, unknown>;

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

    console.log((width + 2) / (height + 2));

    svg = create("svg").attr("width", width).attr("height", height);
    const view = svg.append("g");
    view.append("rect").attr("class","rect").attr("width", 4096).attr("height", 4096).attr("x",0).attr("y",0);
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

    svg.call(zoom.transform, zoomIdentity.translate(width/2,height/2).scale(height/4096*0.5).translate(-4096/2,-4096/2));

    const resizeObserver = new ResizeObserver((entries, observer) => {
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

  return (
    <div class="h-full w-full">
      <button type="button" onClick={reset}>
        reset
      </button>
      <div ref={containerRef} class="h-full"/>
    </div>
  );
}

function TileView() {
  const hash = parseHash(location.hash);
  const [tileset, setTileset] = createSignal<Tileset | undefined>(
    hash.url ? new Tileset(hash.url) : undefined,
  );
  // const [zxy, setZxy] = createSignal<[number,number,number]>([0,0,0]);

  createEffect(() => {
    const t = tileset();
    if (t) {
      location.hash = createHash(location.hash, {
        url: t.url,
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

  return (
    <div class="flex flex-col h-dvh w-full">
      <div class="flex-0">
        <h1 class="text-xl">Tile inspector</h1>
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
        </form>
      </div>
      <Show when={tileset() !== undefined} fallback={<span>fallback</span>}>
        <div class="flex w-full h-full">
          <ZoomableTile />
        </div>
      </Show>
    </div>
  );
}

const root = document.getElementById("root");

if (root) {
  render(() => <TileView />, root);
}
