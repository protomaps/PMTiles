import { useState, useEffect } from "react";
import { PMTiles, leafletLayer as rasterLeafletLayer } from "../../js";
import { leafletLayer as vectorLeafletLayer } from "protomaps";
import { styled } from "./stitches.config";
import { introspectTileType, TileType } from "./Loader";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const MapContainer = styled("div", {
  height: "calc(100vh - $4 - $4)",
});

function LeafletMap(props: { file: PMTiles }) {
  var map: L.Map;
  var currentLayer: L.Layer;
  useEffect(() => {
    map = L.map("map").setView([0, 0], 0);

    return () => {
      map.remove();
    };
  }, []);

  useEffect(() => {
    if (currentLayer) currentLayer.remove();
    let initStyle = async () => {
      if (map) {
        let tileType = await introspectTileType(props.file);
        if (tileType === TileType.PNG || tileType == TileType.JPG) {
          currentLayer = rasterLeafletLayer(props.file, {
            attribution:
              '© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
          });
          currentLayer.addTo(map);
        } else {
          console.error("leaflet vector preview not yet implemented");
          // let metadata = await props.file.metadata();
          // let rules: PaintRule[] = [];

          // if (metadata.json) {
          //   let root = JSON.parse(metadata.json);
          //   if (root.tilestats) {
          //     for (let layer of root.tilestats.layers) {
          //       if (layer.geometry === "Polygon") {
          //       } else if (layer.geometry === "LineString") {
          //       } else {
          //       }
          //     }
          //   }
          // }

          // currentLayer = vectorLeafletLayer(props.file, {paintRules:rules,labelRules:[]})
        }
      }
    };

    initStyle();
  }, []);

  return <MapContainer id="map"></MapContainer>;
}

export default LeafletMap;
