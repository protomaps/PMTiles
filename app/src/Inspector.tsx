import { useState, useEffect, useRef, Dispatch, SetStateAction } from "react";
import { createPortal } from "react-dom";
import { PMTiles, Entry, tileIdToZxy, TileType, Header } from "../../js/index";
import { styled } from "./stitches.config";
import Protobuf from "pbf";
import { VectorTile, VectorTileFeature } from "@mapbox/vector-tile";
import { path } from "d3-path";
import { schemeSet3 } from "d3-scale-chromatic";
import { useMeasure } from "react-use";
import { UncontrolledReactSVGPanZoom } from "react-svg-pan-zoom";

const TableContainer = styled("div", {
  height: "calc(100vh - $4 - $4)",
  overflowY: "scroll",
  width: "calc(100%/3)",
});

const SVGContainer = styled("div", {
  width: "100%",
  height: "calc(100vh - $4 - $4)",
});

const Table = styled("table", {
  padding: "$2",
});

const Pane = styled("div", {
  width: "calc(100%/3*2)",
});

const TableRow = styled(
  "tr",
  {
    cursor: "pointer",
    fontFamily: "monospace",
  },
  { "&:hover": { color: "red" } }
);

const Split = styled("div", {
  display: "flex",
});

const TileRow = (props: {
  entry: Entry;
  setSelectedEntry: (val: Entry | null) => void;
}) => {
  let [z, x, y] = tileIdToZxy(props.entry.tileId);
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
      <td>
        {props.entry.runLength == 0
          ? "directory"
          : `tile(${props.entry.runLength})`}
      </td>
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
      <td>{typeof d[1] === boolean ? JSON.stringify(d[1]) : d[1]}</td>
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
  let [maxExtent, setMaxExtent] = useState<number>(0);
  let [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);
  const Viewer = useRef<UncontrolledReactSVGPanZoom>(null);
  const [ref, { width, height }] = useMeasure<HTMLDivElement>();

  useEffect(() => {
    Viewer.current!.zoomOnViewerCenter(0.1);
  }, []);

  useEffect(() => {
    let fn = async (entry: Entry) => {
      let [z, x, y] = tileIdToZxy(entry.tileId);
      let resp = await props.file.getZxy(z, x, y);

      let tile = new VectorTile(new Protobuf(new Uint8Array(resp!.data)));
      let newLayers = [];
      let max_extent = 0;
      for (let [name, layer] of Object.entries(tile.layers)) {
        if (layer.extent > max_extent) {
          max_extent = layer.extent;
        }
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
      setMaxExtent(max_extent);
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
    <SVGContainer ref={ref}>
      <UncontrolledReactSVGPanZoom
        ref={Viewer}
        width={width}
        height={height}
        detectAutoPan={false}
        onClick={(event) =>
          console.log("click", event.x, event.y, event.originalEvent)
        }
      >
        <svg viewBox="0 0 4096 4096">{elems}</svg>
      </UncontrolledReactSVGPanZoom>
      {selectedFeature ? <FeatureProperties feature={selectedFeature} /> : null}
    </SVGContainer>
  );
};

const RasterPreview = (props: { file: PMTiles; entry: Entry }) => {
  let [imgSrc, setImageSrc] = useState<string>("");

  useEffect(() => {
    let fn = async (entry: Entry) => {
      // TODO 0,0,0 is broken
      let [z, x, y] = tileIdToZxy(entry.tileId);
      let resp = await props.file.getZxy(z, x, y);
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

function getHashString(entry: Entry) {
  const [z, x, y] = tileIdToZxy(entry.tileId);
  let hash = `${z}/${x}/${y}`;

  const hashName = "inspector";
  let found = false;
  const parts = window.location.hash
    .slice(1)
    .split("&")
    .map((part) => {
      const key = part.split("=")[0];
      if (key === hashName) {
        found = true;
        return `${key}=${hash}`;
      }
      return part;
    })
    .filter((a) => a);
  if (!found) {
    parts.push(`${hashName}=${hash}`);
  }
  return `#${parts.join("&")}`;
}

function Inspector(props: { file: PMTiles }) {
  let [entryRows, setEntryRows] = useState<Entry[]>([]);
  let [selectedEntry, setSelectedEntryRaw] = useState<Entry | null>(null);
  let [header, setHeader] = useState<Header | null>(null);

  function setSelectedEntry(val: Entry | null) {
    if (val && val.runLength > 0) {
      window.history.replaceState(window.history.state, "", getHashString(val));
    }
    setSelectedEntryRaw(val);
  }

  useEffect(() => {
    let fn = async () => {
      let header = await props.file.getHeader();
      setHeader(header);
      if (header.specVersion < 3) {
        setEntryRows([]);
      } else if (selectedEntry !== null && selectedEntry.runLength === 0) {
        let entries = await props.file.cache.getDirectory(
          props.file.source,
          header.leafDirectoryOffset + selectedEntry.offset,
          selectedEntry.length,
          header
        );
        setEntryRows(entries);
      } else if (selectedEntry === null) {
        let entries = await props.file.cache.getDirectory(
          props.file.source,
          header.rootDirectoryOffset,
          header.rootDirectoryLength,
          header
        );
        setEntryRows(entries);
      }
    };

    fn();
  }, [props.file, selectedEntry]);

  let rows = entryRows.map((e, i) => (
    <TileRow key={i} entry={e} setSelectedEntry={setSelectedEntry}></TileRow>
  ));

  let tilePreview = <div></div>;
  if (selectedEntry && header?.tileType) {
    if (selectedEntry.runLength === 0) {
      // do nothing
    } else if (header.tileType === TileType.Mvt) {
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
    warning = "Directory listing supported only for PMTiles v3 archives.";
  }

  return (
    <Split>
      <TableContainer>
        {warning}
        <Table>
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
        </Table>
      </TableContainer>
      <Pane>{tilePreview}</Pane>
    </Split>
  );
}

export default Inspector;
