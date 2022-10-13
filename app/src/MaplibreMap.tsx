import { useState, useEffect, useRef } from "react";
import { PMTiles, TileType } from "../../js";
import { Protocol } from "../../js/adapters"
import { styled } from "./stitches.config";
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
  let header = await file.getHeader();
  let metadata = await file.getMetadata();
  let layers: any[] = [];


  var tilestats:any;
  if (metadata.json) {
    let j = JSON.parse(metadata.json);
    tilestats = j.tilestats;
  } else {
    tilestats = metadata.tilestats;
  }

  if (tilestats) {
    for (let layer of tilestats.layers) {
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
  } else {
    layers.push({
      id:"water",
      type:"fill",
      source:"source",
      "source-layer":"water",
      paint: {
        "fill-color":"blue"
      }
    })
    layers.push({
      id:"landuse",
      type:"fill",
      source:"source",
      "source-layer":"landuse",
      paint: {
        "fill-color":"green"
      }
    })
    layers.push({
      id:"roads",
      type:"line",
      source:"source",
      "source-layer":"roads",
      paint: {
        "line-color":"white",
        "line-width":0.5
      }
    })
  }

  return {
    version: 8,
    sources: {
      source: {
        type: "vector",
        tiles: ["pmtiles://" + file.source.getKey() + "/{z}/{x}/{y}"],
        minzoom: header.minZoom,
        maxzoom: header.maxZoom
      },
    },
    layers: layers,
  };
};

function MaplibreMap(props: { file: PMTiles }) {
  let mapContainerRef = useRef<HTMLDivElement>(null);
  let map: maplibregl.Map;

  useEffect(() => {
    let protocol = new Protocol();
    maplibregl.addProtocol("pmtiles", protocol.tile);
    protocol.add(props.file); // this is necessary for non-HTTP sources

    map = new maplibregl.Map({
      container: mapContainerRef.current!,
      hash: true,
      zoom: 0,
      center: [0,0],
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
        let header = await props.file.getHeader();

        map.fitBounds([
          [header.minLon, header.minLat],
          [header.maxLon, header.maxLat],
        ],{animate:false});

        let style: any; // TODO maplibre types (not any)
        if (header.tileType === TileType.Png || header.tileType == TileType.Jpeg) {
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
