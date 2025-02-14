import { type Tileset } from "./tileset";
import { createResource, For, type Setter } from "solid-js";

export function LayersPanel(props: {tileset: Tileset, setActiveLayers: Setter<string[] | undefined>}) {

  const [vectorLayers] = createResource(async () => {
    return props.tileset.getVectorLayers();
  });

  return (
    <div class="bg-white rounded p-4">
      <input type="checkbox" id={`checkall`}/><label for={`checkall`}>All Layers</label>
      <For each={vectorLayers()}>
        {(l) => <div>
        <input type="checkbox" id={`check_${l}`}/><label for={`check_${l}`}>{l}</label>
        </div>}
      </For>
    </div>
  );
}
