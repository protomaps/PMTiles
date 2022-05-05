import { useState, useEffect } from "react";
import { PMTiles } from "../../js";
import { styled } from "./stitches.config";

import Inspector from "./Inspector";
import LeafletMap from "./LeafletMap";
import MaplibreMap from "./MaplibreMap";

function Loader(props: { file: string }) {
  let [tab, setTab] = useState("maplibre");
  let [tileType, setTileType] = useState<string | null>(null);

  let view;
  if (tab === "leaflet") {
    view = <LeafletMap file={props.file} tileType={tileType}/>;
  } else if (tab === "maplibre") {
    view = <MaplibreMap file={props.file} tileType={tileType}/>;
  } else {
    view = <Inspector file={props.file} />;
  }

  useEffect(() => {
    let pmtiles = new PMTiles(props.file);
    const fetchData = async () => {
      let metadata = await pmtiles.metadata();

      let resp = await fetch(props.file, {
        headers: { Range: "bytes=512000-512003" },
      });
      let magic = new DataView(await resp.arrayBuffer());
      let b0 = magic.getUint8(0);
      let b1 = magic.getUint8(1);
      let b2 = magic.getUint8(2);
      let b3 = magic.getUint8(3);

      if (b0 == 0x89 && b1 == 0x50 && b2 == 0x4e && b3 == 0x47) {
        setTileType("png");
      } else if (b0 == 0xff && b1 == 0xd8 && b2 == 0xff && b3 == 0xe0) {
        setTileType("jpg")
      } else if (b0 == 0x1f && b1 == 0x8b) {
        setTileType("mvt.gz");
      } else {
        setTileType("mvt");
      }
    };
    fetchData();
  }, [props.file]);

  return <>
    <div>{props.file} | {tileType}</div>
    {view}
  </>;
}

export default Loader;
