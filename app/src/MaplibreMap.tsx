import { useState, useEffect, useRef } from "react";
import { PMTiles, TileType } from "../../js/index";
import { Protocol } from "../../js/adapters";
import { styled } from "./stitches.config";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { schemeSet3 } from "d3-scale-chromatic";

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

  var tilestats: any;
  var vector_layers: any;
  if (metadata.json) {
    let j = JSON.parse(metadata.json);
    tilestats = j.tilestats;
    vector_layers = j.vector_layers;
  } else {
    tilestats = metadata.tilestats;
    vector_layers = metadata.vector_layers;
  }

  if (vector_layers) {
    for (let [i,layer] of vector_layers.entries()) {
      layers.push({
        id: layer.id + "_fill",
        type: "fill",
        source: "source",
        "source-layer": layer.id,
        paint: {
          "fill-color": schemeSet3[i % 12],
          "fill-opacity": 0.2,
        },
        filter: ["==", ["geometry-type"], "Polygon"],
      });
      layers.push({
        id: layer.id + "_stroke",
        type: "line",
        source: "source",
        "source-layer": layer.id,
        paint: {
          "line-color": schemeSet3[i % 12],
          "line-width": 0.5,
        },
        filter: ["==", ["geometry-type"], "LineString"],
      });
      layers.push({
        id: layer.id + "_point",
        type: "circle",
        source: "source",
        "source-layer": layer.id,
        paint: {
          "circle-color": schemeSet3[i % 12],
        },
        filter: ["==", ["geometry-type"], "Point"],
      });
    }
  } else if (tilestats) {
    for (let [i,layer] of tilestats.layers.entries()) {
      if (layer.geometry === "Polygon") {
        layers.push({
          id: layer.layer + "_fill",
          type: "fill",
          source: "source",
          "source-layer": layer.layer,
          paint: {
            "fill-color": schemeSet3[i % 12],
            "fill-opacity": 0.2,
          },
        });
      } else if (layer.geometry === "LineString") {
        layers.push({
          id: layer.layer + "_stroke",
          type: "line",
          source: "source",
          "source-layer": layer.layer,
          paint: {
            "line-color": schemeSet3[i % 12],
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
            "circle-color": schemeSet3[i % 12],
          },
        });
      }
    }
  }

  return {
    version: 8,
    sources: {
      source: {
        type: "vector",
        tiles: ["pmtiles://" + file.source.getKey() + "/{z}/{x}/{y}"],
        minzoom: header.minZoom,
        maxzoom: header.maxZoom,
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
      center: [0, 0],
      style: {
        version: 8,
        sources: {},
        layers: [],
      },
    });
    map.showTileBoundaries = true;
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

        map.fitBounds(
          [
            [header.minLon, header.minLat],
            [header.maxLon, header.maxLat],
          ],
          { animate: false }
        );

        let style: any; // TODO maplibre types (not any)
        if (
          header.tileType === TileType.Png ||
          header.tileType == TileType.Jpeg
        ) {
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
