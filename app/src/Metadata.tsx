import { useState, useEffect } from "react";
import { PMTiles } from "../../js";
import { styled } from "./stitches.config";
import { JsonViewer } from "@textea/json-viewer";

const Padded = styled("div", {
  padding: "2rem",
});

function Metadata(props: { file: PMTiles }) {
  let [metadata, setMetadata] = useState<any>();

  useEffect(() => {
    let pmtiles = props.file;
    const fetchData = async () => {
      let m = await pmtiles.getMetadata();
      setMetadata(m);
    };
    fetchData();
  }, [props.file]);

  return (
    <Padded>
      <JsonViewer value={metadata} theme="dark" defaultInspectDepth={1} />
    </Padded>
  );
}

export default Metadata;
