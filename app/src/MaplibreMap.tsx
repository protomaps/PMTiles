import { useState, useEffect, useRef } from "react";
import { PMTiles, ProtocolCache } from "../../js";
import { styled } from "./stitches.config";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const MapContainer = styled("div", {
  height: "calc(100vh - $4)",
});

const rasterStyle = (file:string) => {
  return {
    version: 8,
    sources: {
      source: {
        type: "raster",
        tiles: ["pmtiles://" + file + "/{z}/{x}/{y}"],
        maxzoom:4
      },
    },
    layers: [
      {
        id: "raster",
        type: "raster",
        source: "source"
      },
    ],
  };
};

const vectorStyle = (file:string) => {
  return {
    version: 8,
    sources: {
      source: {
        type: "vector",
        tiles: ["pmtiles://" + file + "/{z}/{x}/{y}"],
        maxzoom: 7,
      },
    },
    layers: [
      {
        id: "zcta_fill",
        type: "fill",
        source: "source",
        "source-layer": "zcta",
        paint: {
          "fill-color": "white",
        },
      },
      {
        id: "zcta_stroke",
        type: "line",
        source: "source",
        "source-layer": "zcta",
        paint: {
          "line-color": "steelblue",
          "line-width": 0.5,
        },
      },
    ],
  };
};

function MaplibreMap(props: { file: string, tileType: string | null }) {
  let mapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let cache = new ProtocolCache();
    maplibregl.addProtocol("pmtiles", cache.protocol);

    const map = new maplibregl.Map({
      container: "map",
      zoom: 0,
      center: [0, 0],
      style: rasterStyle(props.file) as any,
    }); // TODO maplibre types (not any)
    map.on("load", map.resize);

    return () => {
      map.remove();
    };
  }, []);

  return <MapContainer id="map" ref={mapRef}></MapContainer>;
}

export default MaplibreMap;
