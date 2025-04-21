import { For } from "solid-js";

export interface InspectableFeature {
  layerName: string;
  type: number;
  id: number;
  properties: { [key: string]: string | number | boolean };
}

const intToGeomType = (n: number) => {
  if (n === 1) return "Point";
  if (n === 2) return "LineString";
  return "Polygon";
};

export const FeatureTable = (props: { features: InspectableFeature[] }) => {
  return (
    <div class="max-h-120 overflow-y-scroll divide-y app-divide">
      <For each={props.features}>
        {(f) => (
          <div class="p-2">
            <div>
              {f.layerName} {intToGeomType(f.type)}
            </div>
            <div class="text-xs font-mono app-text-light">ID {f.id}</div>
            <table class="font-mono table-auto border-separate border-spacing-x-2">
              <tbody>
                <For each={Object.entries(f.properties)}>
                  {([key, value]) => (
                    <tr>
                      <td class="text-right app-text-light">{key}</td>
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
