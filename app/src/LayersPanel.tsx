import { For, type Setter, Show, createResource } from "solid-js";
import type { Tileset } from "./tileset";
import { colorForIdx } from "./utils";

export interface LayerVisibility {
  id: string;
  visible: boolean;
}

export function LayersPanel(props: {
  layerVisibility: Accessor<LayerVisibility[]>;
  setLayerVisibility: Setter<LayerVisibility[]>;
  layerFeatureCounts?: Record<string, number>;
}) {
  return (
    <div class="bg-white dark:bg-gray-900 dark:text-white rounded p-4 border border-gray-700">
      <input type="checkbox" id={"checkall"} />
      <label class="ml-2 text-sm" for={"checkall"}>
        All Layers
      </label>
      <For each={props.layerVisibility()}>
        {(l, i) => (
          <div class="ml-2">
            <input type="checkbox" id={`check_${l.id}`} checked={l.visible} />
            <label class="ml-2 text-sm" for={`check_${l.id}`}>
              <span
                class="inline-block mr-2 w-[10px] h-[10px]"
                style={{ "background-color": colorForIdx(i()) }}
              />
              {l.id}
              <Show when={props.layerFeatureCounts !== undefined}>
                <span class="ml-1">
                  ({props.layerFeatureCounts[l.id] || 0})
                </span>
              </Show>
            </label>
          </div>
        )}
      </For>
    </div>
  );
}
