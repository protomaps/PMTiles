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
    <div class="font-mono max-h-120 overflow-y-scroll">
      <For each={props.features}>
        {(f) => (
          <div>
            {f.layerName} {intToGeomType(f.type)}
            <div class="text-xs">ID {f.id}</div>
            <table class="table-auto border-separate border-spacing-1 border">
              <tbody>
                <For each={Object.entries(f.properties)}>
                  {([key, value]) => (
                    <tr>
                      <td class="text-right text-gray-400">{key}</td>
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
