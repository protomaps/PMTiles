import { useState, useEffect } from "react";
import { PMTiles, Header } from "../../js/index";
import { styled } from "./stitches.config";
import { JsonViewer } from "@textea/json-viewer";

const Padded = styled("div", {
  padding: "2rem",
});

const Heading = styled("div", {
  paddingBottom: "2rem",
  fontFamily: "monospace",
});

function Metadata(props: { file: PMTiles }) {
  let [metadata, setMetadata] = useState<any>();
  let [header, setHeader] = useState<Header | null>(null);

  useEffect(() => {
    let pmtiles = props.file;
    const fetchData = async () => {
      setMetadata(await pmtiles.getMetadata());
      setHeader(await pmtiles.getHeader());
    };
    fetchData();
  }, [props.file]);

  return (
    <Padded>
      {header ? (
        <Heading>
          <div>
            root directory: offset={header.rootDirectoryOffset} len=
            {header.rootDirectoryLength}
          </div>
          <div>
            metadata: offset={header.jsonMetadataOffset} len=
            {header.jsonMetadataLength}
          </div>
          <div>
            leaf directories: offset={header.leafDirectoryOffset} len=
            {header.leafDirectoryLength}
          </div>
          <div>
            tile data: offset={header.tileDataOffset} len=
            {header.tileDataLength}
          </div>
          <div>num addressed tiles: {header.numAddressedTiles}</div>
          <div>num tile entries: {header.numTileEntries}</div>
          <div>num tile contents: {header.numTileContents}</div>
          <div>clustered: {header.clustered ? "true" : "false"}</div>
          <div>internal compression: {header.internalCompression}</div>
          <div>tile compression: {header.tileCompression}</div>
          <div>tile type: {header.tileType}</div>
          <div>min zoom: {header.minZoom}</div>
          <div>max zoom: {header.maxZoom}</div>
          <div>
            min lon, min lat, max lon, max lat: {header.minLon}, {header.minLat}
            , {header.maxLon}, {header.maxLat}
          </div>
          <div>center zoom: {header.centerZoom}</div>
          <div>
            center lon, center lat: {header.centerLon}, {header.centerLat}
          </div>
        </Heading>
      ) : null}

      <JsonViewer value={metadata} theme="dark" defaultInspectDepth={1} />
    </Padded>
  );
}

export default Metadata;
