import { useState, useEffect, useRef } from "react";
import { PMTiles, ProtocolCache } from "../../js";
import { styled } from "./stitches.config";
import { introspectTileType, TileType } from "./Loader";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const MapContainer = styled("div", {
  height: "calc(100vh - $4 - $4)",
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

const vectorStyle = async (file: PMTiles): Promise<any> => {
  let metadata = await file.metadata();
  let layers: any[] = [];

  if (metadata.json) {
    let root = JSON.parse(metadata.json);
    if (root.tilestats) {
      for (let layer of root.tilestats.layers) {
        if (layer.geometry === "Polygon") {
          layers.push({
            id: layer.layer + "_fill",
            type: "fill",
            source: "source",
            "source-layer": layer.layer,
            paint: {
              "fill-color": "white",
            },
          });
        } else if (layer.geometry === "LineString") {
          layers.push({
            id: layer.layer + "_stroke",
            type: "line",
            source: "source",
            "source-layer": layer.layer,
            paint: {
              "line-color": "steelblue",
              "line-width": 0.5,
            },
          });
        } else {
          layers.push({
            id: layer.layer + "_point",
            type: "circle",
            source: "source",
            "source-layer": layer.layer,
            paint: {
              "circle-color": "red",
            },
          });
        }
      }
    }
  }

  return {
    version: 8,
    sources: {
      source: {
        type: "vector",
        tiles: ["pmtiles://" + file.source.getKey() + "/{z}/{x}/{y}"],
        maxzoom: 10,
      },
    },
    layers: layers,
  };
};

function MaplibreMap(props: { file: PMTiles }) {
  let mapContainerRef = useRef<HTMLDivElement>(null);
  let map: maplibregl.Map;

  useEffect(() => {
    let cache = new ProtocolCache();
    maplibregl.addProtocol("pmtiles", cache.protocol);
    cache.add(props.file); // this is necessary for non-HTTP sources

    map = new maplibregl.Map({
      container: mapContainerRef.current!,
      zoom: 0,
      center: [0, 0],
      style: {
        version: 8,
        sources: {},
        layers: [],
      },
    });
    map.addControl(new maplibregl.NavigationControl({}));
    map.on("load", map.resize);

    return () => {
      map.remove();
    };
  }, []);

  useEffect(() => {
    let initStyle = async () => {
      if (map) {
        let metadata = await props.file.metadata();
        let bounds = metadata.bounds.split(",");
        map.fitBounds([
          [+bounds[0], +bounds[1]],
          [+bounds[2], +bounds[3]],
        ]);
        let tileType = await introspectTileType(props.file);
        let style: any; // TODO maplibre types (not any)
        if (tileType === TileType.PNG || tileType == TileType.JPG) {
          map.setStyle(rasterStyle(props.file) as any);
        } else {
          let style = await vectorStyle(props.file);
          map.setStyle(style);
        }
      }
    };

    initStyle();
  }, []);

  return <MapContainer ref={mapContainerRef}></MapContainer>;
}

export default MaplibreMap;
