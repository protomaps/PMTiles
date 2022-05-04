import { useState, useEffect } from "react";
import { PMTiles, ProtocolCache } from "../../js";
import { styled } from "./stitches.config";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css"

const MapContainer = styled("div", {
  height: "calc(100vh - $4)",
});

function MaplibreMap(props:{file:string}) {
  let cache = new ProtocolCache();
  maplibregl.addProtocol("pmtiles",cache.protocol);

  var style = {
      "version": 8,
      "sources": {
          "zcta": {
              "type": "vector",
              "tiles": ["pmtiles://" + props.file + "/{z}/{x}/{y}"],
              "maxzoom":7
          }
      },
      "layers": [
          {
              "id": "zcta_fill",
              "type": "fill",
              "source":"zcta",
              "source-layer":"zcta",
              "paint": {
                  "fill-color":"white"
              }
          },
          {
              "id": "zcta_stroke",
              "type": "line",
              "source":"zcta",
              "source-layer":"zcta",
              "paint": {
                  "line-color":"steelblue",
                  "line-width":0.5
              }
          }
      ]
  }

  useEffect(() => {
    const map = new maplibregl.Map({container:"map",zoom:3,center:[-101.43,44.34],style:style as any}); // TODO maplibre types

    return () => {
      map.remove();
    };
  }, []);

  return <MapContainer id="map"></MapContainer>;
}

export default MaplibreMap;
