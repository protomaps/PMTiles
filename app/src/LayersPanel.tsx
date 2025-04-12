import { For, type Setter, Show, createResource } from "solid-js";
import type { Tileset } from "./tileset";

export function LayersPanel(props: {
  tileset: Tileset;
  setActiveLayers: Setter<string[] | undefined>;
  layerFeatureCounts?: Record<string, number>;
}) {
  const [vectorLayers] = createResource(async () => {
    if (await props.tileset.isVector()) {
      return props.tileset.getVectorLayers();
    }
    return [];
  });

  return (
    <div class="bg-white dark:bg-gray-900 dark:text-white rounded p-4 border border-gray-700">
      <input type="checkbox" id={"checkall"} />
      <label class="ml-2 text-sm" for={"checkall"}>
        All Layers
      </label>
      <For each={vectorLayers()}>
        {(l) => (
          <div class="ml-2">
            <input type="checkbox" id={`check_${l}`} />
            <label class="ml-2 text-sm" for={`check_${l}`}>
              {l}
              <Show when={props.layerFeatureCounts !== undefined}>
                <span class="ml-1">({props.layerFeatureCounts[l] || 0})</span>
              </Show>
            </label>
          </div>
        )}
      </For>
    </div>
  );
}
