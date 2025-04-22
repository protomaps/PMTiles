import {
  type Accessor,
  For,
  type Setter,
  Show,
  createEffect,
  createMemo,
  createSignal,
} from "solid-js";
import { colorForIdx } from "./utils";

export interface LayerVisibility {
  id: string;
  visible: boolean;
}

export function LayersPanel(props: {
  layerVisibility: Accessor<LayerVisibility[]>;
  setLayerVisibility: Setter<LayerVisibility[]>;
  layerFeatureCounts?: Record<string, number>;

  basemapOption?: boolean;
  basemap?: Accessor<boolean>;
  setBasemap?: Setter<boolean>;
}) {
  let checkallRef: HTMLInputElement | undefined;
  const [expanded, setExpanded] = createSignal<boolean>(true);

  const onChange = (id: string) => {
    const newLayerVisibility = props
      .layerVisibility()
      .map((l: LayerVisibility) =>
        l.id === id ? { ...l, visible: !l.visible } : l,
      );
    props.setLayerVisibility(newLayerVisibility);
  };

  const allChecked = createMemo(() => {
    const visibleLayersCount = props
      .layerVisibility()
      .filter((l: LayerVisibility) => l.visible).length;
    return visibleLayersCount === props.layerVisibility().length;
  });

  const toggleAll = () => {
    props.setLayerVisibility(
      props
        .layerVisibility()
        .map((l: LayerVisibility) => ({ ...l, visible: !allChecked() })),
    );
  };

  createEffect(() => {
    const visibleLayersCount = props
      .layerVisibility()
      .filter((l) => l.visible).length;
    const indeterminate =
      visibleLayersCount > 0 &&
      visibleLayersCount !== props.layerVisibility().length;
    if (checkallRef) {
      checkallRef.indeterminate = indeterminate;
    }
  });

  return (
    <div class="app-bg rounded app-border flex flex-col overflow-y-scroll max-h-100">
      <button
        type="button"
        classList={{
          "app-well": true,
          "rounded-t": expanded(),
          rounded: !expanded(),
          "cursor-pointer": true,
          "min-w-8": true,
        }}
        onClick={() => setExpanded(!expanded())}
      >
        {expanded() ? "-" : "+"}
      </button>
      <Show when={expanded()}>
        <div class="px-2 md:px-4 pb-2 md:pb-4">
          <Show when={props.basemapOption}>
            <div>
              <input
                type="checkbox"
                id="background"
                checked={props.basemap?.()}
                onChange={() => props.setBasemap?.(!props.basemap?.())}
              />
              <label class="ml-2 text-sm" for="background">
                Background
              </label>
            </div>
          </Show>
          <div>
            <input
              type="checkbox"
              id="checkall"
              ref={checkallRef}
              checked={allChecked()}
              onChange={toggleAll}
            />
            <label class="ml-2 text-sm" for="checkall">
              All Layers
            </label>
          </div>
          <For each={props.layerVisibility()}>
            {(l, i) => (
              <div class="ml-2">
                <input
                  type="checkbox"
                  id={`check_${l.id}`}
                  checked={l.visible}
                  onChange={() => onChange(l.id)}
                />
                <label class="ml-2 text-sm" for={`check_${l.id}`}>
                  <span
                    class="inline-block mr-2 w-[10px] h-[10px]"
                    style={{ "background-color": colorForIdx(i()) }}
                  />
                  {l.id}
                  <Show when={props.layerFeatureCounts}>
                    {(layerFeatureCounts) => (
                      <span class="ml-1">
                        ({layerFeatureCounts()[l.id] || 0})
                      </span>
                    )}
                  </Show>
                </label>
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
