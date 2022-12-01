import { useState, useEffect, Dispatch, SetStateAction } from "react";
import { createPortal } from "react-dom";
import { PMTiles, Entry, tileIdToZxy, TileType, Header } from "../../js";
import { styled } from "./stitches.config";
import { decompressSync } from "fflate";
import Protobuf from "pbf";
import { VectorTile, VectorTileFeature } from "@mapbox/vector-tile";
import { path } from "d3-path";
import { schemeSet3 } from "d3-scale-chromatic";
import * as DialogPrimitive from "@radix-ui/react-dialog";

const TableContainer = styled("div", {
  height: "calc(100vh - $4 - $4)",
  overflowY: "scroll",
  width: "50%",
  padding: "$2",
});

const Pane = styled("div", {
  width: "50%",
  backgroundColor: "black",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundSize: "20px 20px",
  backgroundImage:
    "linear-gradient(to right, #111 1px, transparent 1px),linear-gradient(to bottom, #111 1px, transparent 1px);",
});

const TableRow = styled(
  "tr",
  {
    cursor: "pointer",
  },
  { "&:hover": { color: "red" } }
);

const Split = styled("div", {
  display: "flex",
});

const TileRow = (props: {
  entry: Entry;
  setSelectedEntry: Dispatch<SetStateAction<Entry | null>>;
}) => {
  let [z,x,y] = tileIdToZxy(props.entry.tileId);
  return (
    <TableRow
      onClick={() => {
        props.setSelectedEntry(props.entry);
      }}
    >
      <td>{props.entry.tileId}</td>
      <td>{z}</td>
      <td>{x}</td>
      <td>{y}</td>
      <td>{props.entry.offset}</td>
      <td>{props.entry.length}</td>
      <td>{props.entry.runLength == 0 ? "directory" : "tile"}</td>
    </TableRow>
  );
};

interface Layer {
  name: string;
  features: Feature[];
}

interface Feature {
  layerName: string;
  path: string;
  type: number;
  id: number;
  properties: any;
}

let smartCompare = (a: Layer, b: Layer): number => {
  if (a.name === "earth") return -4;
  if (a.name === "water") return -3;
  if (a.name === "natural") return -2;
  if (a.name === "landuse") return -1;
  if (a.name === "places") return 1;
  return 0;
};

const FeatureSvg = (props: {
  feature: Feature;
  setSelectedFeature: Dispatch<SetStateAction<Feature | null>>;
}) => {
  let [highlighted, setHighlighted] = useState(false);
  let fill = "none";
  let stroke = "";

  if (props.feature.type === 3) {
    fill = highlighted ? "white" : "currentColor";
  } else {
    stroke = highlighted ? "white" : "currentColor";
  }

  let mouseOver = () => {
    setHighlighted(true);
  };

  let mouseOut = () => {
    setHighlighted(false);
  };

  let mouseDown = () => {
    props.setSelectedFeature(props.feature);
  };

  return (
    <path
      d={props.feature.path}
      stroke={stroke}
      strokeWidth={10}
      fill={fill}
      fillOpacity={0.5}
      onMouseOver={mouseOver}
      onMouseOut={mouseOut}
      onMouseDown={mouseDown}
    ></path>
  );
};

const LayerSvg = (props: {
  layer: Layer;
  color: string;
  setSelectedFeature: Dispatch<SetStateAction<Feature | null>>;
}) => {
  let elems = props.layer.features.map((f, i) => (
    <FeatureSvg
      key={i}
      feature={f}
      setSelectedFeature={props.setSelectedFeature}
    ></FeatureSvg>
  ));
  return <g color={props.color}>{elems}</g>;
};

const StyledFeatureProperties = styled("div", {
  position: "absolute",
  right: 0,
  bottom: 0,
  backgroundColor: "$black",
  padding: "$1",
});

const FeatureProperties = (props: { feature: Feature }) => {
  let tmp: [string, string][] = [];
  for (var key in props.feature.properties) {
    tmp.push([key, props.feature.properties[key]]);
  }

  const rows = tmp.map((d, i) => (
    <tr key={i}>
      <td>{d[0]}</td>
      <td>{d[1]}</td>
    </tr>
  ));

  return (
    <StyledFeatureProperties>
      {props.feature.layerName}
      <table>
        <tbody>{rows}</tbody>
      </table>
    </StyledFeatureProperties>
  );
};

const VectorPreview = (props: {
  file: PMTiles;
  entry: Entry;
  tileType: TileType;
}) => {
  let [layers, setLayers] = useState<Layer[]>([]);
  let [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);

  useEffect(() => {
    let fn = async (entry: Entry) => {
      let [z,x,y] = tileIdToZxy(entry.tileId);
      let resp = await props.file.getZxy(z,x,y);

      let tile = new VectorTile(
        new Protobuf(
          new Uint8Array(resp!.data)
        )
      );
      let newLayers = [];
      for (let [name, layer] of Object.entries(tile.layers)) {
        let features: Feature[] = [];
        for (var i = 0; i < layer.length; i++) {
          let feature = layer.feature(i);
          let p = path();
          let geom = feature.loadGeometry();

          if (feature.type === 1) {
            for (let ring of geom) {
              for (let pt of ring) {
                p.arc(pt.x, pt.y, 20, 0, 2 * Math.PI);
              }
            }
          } else {
            for (let ring of geom) {
              p.moveTo(ring[0].x, ring[0].y);
              for (var j = 1; j < ring.length; j++) {
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
            layerName: name,
          });
        }
        newLayers.push({ features: features, name: name });
      }
      newLayers.sort(smartCompare);
      setLayers(newLayers);
    };

    if (props.entry) {
      fn(props.entry);
    }
  }, [props.entry]);

  let elems = layers.map((l, i) => (
    <LayerSvg
      key={i}
      layer={l}
      color={schemeSet3[i % 12]}
      setSelectedFeature={setSelectedFeature}
    ></LayerSvg>
  ));

  return (
    <div>
      <svg viewBox="0 0 4096 4096" width={800} height={800}>
        {elems}
      </svg>
      {selectedFeature ? <FeatureProperties feature={selectedFeature} /> : null}
    </div>
  );
};

const RasterPreview = (props: { file: PMTiles; entry: Entry }) => {
  let [imgSrc, setImageSrc] = useState<string>("");

  useEffect(() => {
    let fn = async (entry: Entry) => {
      // TODO 0,0,0 is broken
      let [z,x,y] = tileIdToZxy(entry.tileId);
      let resp = await props.file.getZxy(z,x,y);
      let blob = new Blob([resp!.data]);
      var imageUrl = window.URL.createObjectURL(blob);
      setImageSrc(imageUrl);
    };

    if (props.entry) {
      fn(props.entry);
    }
  }, [props.entry]);

  return <img src={imgSrc}></img>;
};

function Inspector(props: { file: PMTiles }) {
  let [entryRows, setEntryRows] = useState<Entry[]>([]);
  let [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  let [header, setHeader] = useState<Header | null>(null);

  useEffect(() => {
    let fn = async () => {
      let header = await props.file.getHeader();
      let entries = await props.file.root_entries();
      setEntryRows(entries);
      setHeader(header);
    };

    fn();
  }, [props.file]);

  let rows = entryRows.map((e, i) => (
    <TileRow key={i} entry={e} setSelectedEntry={setSelectedEntry}></TileRow>
  ));

  let tilePreview = <div></div>;
  if (selectedEntry && header?.tileType) {
    if (header.tileType === TileType.Mvt) {
      tilePreview = (
        <VectorPreview
          file={props.file}
          entry={selectedEntry}
          tileType={header.tileType}
        />
      );
    } else {
      tilePreview = <RasterPreview file={props.file} entry={selectedEntry} />;
    }
  }

  let warning = "";
  if (header && header.specVersion < 3) {
    warning = "Directory listing supported only for PMTiles v3 archives."
  }

  return (
    <Split>
      <TableContainer>
        {warning}
        <table>
          <thead>
            <tr>
              <th>tileid</th>
              <th>z</th>
              <th>x</th>
              <th>y</th>
              <th>offset</th>
              <th>length</th>
              <th>type</th>
            </tr>
          </thead>
          <tbody>{rows}</tbody>
        </table>
      </TableContainer>
      <Pane>{tilePreview}</Pane>
    </Split>
  );
}

export default Inspector;
