import { For, type Setter, createResource } from "solid-js";
import type { Tileset } from "./tileset";

export function LayersPanel(props: {
  tileset: Tileset;
  setActiveLayers: Setter<string[] | undefined>;
}) {
  const [vectorLayers] = createResource(async () => {
    if (await props.tileset.isVector()) {
      return props.tileset.getVectorLayers();
    }
    return [];
  });

  return (
    <div class="bg-white dark:bg-gray-900 dark:text-white rounded p-4">
      <input type="checkbox" id={"checkall"} />
      <label for={"checkall"}>All Layers</label>
      <For each={vectorLayers()}>
        {(l) => (
          <div>
            <input type="checkbox" id={`check_${l}`} />
            <label for={`check_${l}`}>{l}</label>
          </div>
        )}
      </For>
    </div>
  );
}
