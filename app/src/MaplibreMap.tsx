import { useState, useEffect, useRef } from "react";
import { PMTiles, ProtocolCache } from "../../js";
import { styled } from "./stitches.config";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const MapContainer = styled("div", {
  height: "calc(100vh - $4)",
});

const rasterStyle = (file: PMTiles) => {
  return {
    version: 8,
    sources: {
      source: {
        type: "raster",
        tiles: ["pmtiles://" + file.source.getKey() + "/{z}/{x}/{y}"],
        maxzoom: 4,
      },
    },
    layers: [
      {
        id: "raster",
        type: "raster",
        source: "source",
      },
    ],
  };
};

const vectorStyle = (file: PMTiles) => {
  return {
    version: 8,
    sources: {
      source: {
        type: "vector",
        tiles: ["pmtiles://" + file.source.getKey() + "/{z}/{x}/{y}"],
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

function MaplibreMap(props: { file: PMTiles; tileType: string | null }) {
  let mapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let cache = new ProtocolCache();
    maplibregl.addProtocol("pmtiles", cache.protocol);
    cache.add(props.file);

    const map = new maplibregl.Map({
      container: "map",
      zoom: 0,
      center: [0, 0],
      style: rasterStyle(props.file) as any,
    }); // TODO maplibre types (not any)
    map.addControl(new maplibregl.NavigationControl({}));
    map.on("load", map.resize);

    return () => {
      map.remove();
    };
  }, []);

  return <MapContainer id="map" ref={mapRef}></MapContainer>;
}

export default MaplibreMap;
