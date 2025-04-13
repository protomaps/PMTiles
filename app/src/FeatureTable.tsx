import { For } from "solid-js";

export interface InspectableFeature {
  layerName: string;
  type: number;
  id: number;
  properties: { [key: string]: string | number | boolean };
}

export const FeatureTable = (props: { features: InspectableFeature[] }) => {
  return (
    <div class="font-mono">
      <For each={props.features}>
        {(f) => (
          <div>
            {f.layerName} {f.type}
            <div class="text-xs">ID {f.id}</div>
            <table class="table-auto border-separate border-spacing-1 border">
              <tbody>
                <For each={Object.entries(f.properties)}>
                  {([key, value]) => (
                    <tr>
                      <td>{key}</td>
                      <td>
                        {typeof value === "boolean"
                          ? JSON.stringify(value)
                          : value.toString()}
                      </td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
        )}
      </For>
    </div>
  );
};
