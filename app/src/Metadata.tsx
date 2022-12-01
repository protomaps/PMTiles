import { useState, useEffect, useRef } from "react";
import { PMTiles, TileType } from "../../js";
import { Protocol } from "../../js/adapters";
import { styled } from "./stitches.config";

const MetadataTable = styled("table", {
  tableLayout: "fixed",
  width: "100%",
});

const MetadataKey = styled("td", {
  padding: "0 $1",
});

const MetadataValue = styled("td", {
  fontFamily: "monospace",
});

const JsonValue = styled(MetadataValue, {
  overflowX: "scroll",
});

function Metadata(props: { file: PMTiles }) {
  let [metadata, setMetadata] = useState<[string, string][]>([]);

  useEffect(() => {
    let pmtiles = props.file;
    const fetchData = async () => {
      let m = await pmtiles.getMetadata();
      let tmp: [string, string][] = [];
      for (var key in m) {
        let val = m[key];
        tmp.push([key, JSON.stringify(val)]);
      }
      setMetadata(tmp);
    };
    fetchData();
  }, [props.file]);

  const metadataRows = metadata.map((d, i) => {
    let Cls = d[0] === "json" ? JsonValue : MetadataValue;
    return (
      <tr key={i}>
        <MetadataKey>{d[0]}</MetadataKey>
        <Cls>{d[1]}</Cls>
      </tr>
    );
  });

  return (
    <MetadataTable>
      <thead>
        <tr>
          <th>key</th>
          <th>value</th>
        </tr>
      </thead>
      <tbody>{metadataRows}</tbody>
    </MetadataTable>
  );
}

export default Metadata;
