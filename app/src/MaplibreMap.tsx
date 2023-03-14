import { useState, useEffect, useRef } from "react";
import { renderToString } from "react-dom/server";
import { PMTiles, TileType } from "../../js/index";
import { Protocol } from "../../js/adapters";
import { styled } from "./stitches.config";
import maplibregl from "maplibre-gl";
import { MapGeoJSONFeature } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { schemeSet3 } from "d3-scale-chromatic";
import base_theme from "protomaps-themes-base";

maplibregl.setRTLTextPlugin(
  "https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.2.3/mapbox-gl-rtl-text.min.js",
  () => {},
  true
);

const MapContainer = styled("div", {
  height: "calc(100vh - $4 - $4)",
});

const PopupContainer = styled("div", {
  color: "black",
});

const FeatureRow = styled("div", {
  marginBottom: "0.5em",
  "&:not(:last-of-type)": {
    borderBottom: "1px solid black",
  },
});

const Hamburger = styled("div", {
  position: "absolute",
  top: "10px",
  right: "10px",
  width: 40,
  height: 40,
  backgroundColor: "#444",
  cursor: "pointer",
  zIndex: 9999,
});

const Options = styled("div", {
  position: "absolute",
  backgroundColor: "#444",
  top: "50px",
  right: "10px",
  padding: "$1",
  zIndex: 9999,
});

const FeaturesProperties = (props: { features: MapGeoJSONFeature[] }) => {
  const fs = props.features.map((f, i) => {
    let tmp: [string, string][] = [];
    for (var key in f.properties) {
      tmp.push([key, f.properties[key]]);
    }

    const rows = tmp.map((d, i) => (
      <tr key={i}>
        <td>{d[0]}</td>
        <td>{d[1]}</td>
      </tr>
    ));

    return (
      <FeatureRow key={i}>
        <div>
          <strong>{(f.layer as any)["source-layer"]}</strong>
        </div>
        <table>{rows}</table>
      </FeatureRow>
    );
  });
  return <PopupContainer>{fs}</PopupContainer>;
};

const rasterStyle = async (file: PMTiles): Promise<any> => {
  let header = await file.getHeader();
  return {
    version: 8,
    sources: {
      source: {
        type: "raster",
        tiles: ["pmtiles://" + file.source.getKey() + "/{z}/{x}/{y}"],
        minzoom: header.minZoom,
        maxzoom: header.maxZoom,
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

  if (metadata.type !== "baselayer") {
    layers = base_theme("basemap", "black");
    layers[0].paint["background-color"] = "black";
  }

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
    for (let [i, layer] of vector_layers.entries()) {
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
  }

  for (let layer of layers) {
    if (layer["source-layer"] === "mask" && layer["type"] === "fill") {
      layer.paint["fill-color"] = "black";
      layer.paint["fill-opacity"] = 0.8;
    }
  }

  const bounds = [header.minLon, header.minLat, header.maxLon, header.maxLat];

  return {
    version: 8,
    sources: {
      source: {
        type: "vector",
        tiles: ["pmtiles://" + file.source.getKey() + "/{z}/{x}/{y}"],
        minzoom: header.minZoom,
        maxzoom: header.maxZoom,
        bounds: bounds,
      },
      basemap: {
        type: "vector",
        tiles: [
          "https://api.protomaps.com/tiles/v2/{z}/{x}/{y}.pbf?key=1003762824b9687f",
        ],
        maxzoom: 14,
        bounds: bounds,
      },
    },
    glyphs: "https://cdn.protomaps.com/fonts/pbf/{fontstack}/{range}.pbf",
    layers: layers,
  };
};

function MaplibreMap(props: { file: PMTiles }) {
  let mapContainerRef = useRef<HTMLDivElement>(null);
  let [hamburgerOpen, setHamburgerOpen] = useState<boolean>(true);
  let [showAttributes, setShowAttributes] = useState<boolean>(false);
  let [showTileBoundaries, setShowTileBoundaries] = useState<boolean>(false);
  const mapRef = useRef<maplibregl.Map | null>(null);

  // make it accessible in hook
  const showAttributesRef = useRef(showAttributes);
  useEffect(() => {
    showAttributesRef.current = showAttributes;
  });

  const toggleHamburger = () => {
    setHamburgerOpen(!hamburgerOpen);
  };

  const toggleShowAttributes = () => {
    setShowAttributes(!showAttributes);
  };

  const toggleShowTileBoundaries = () => {
    setShowTileBoundaries(!showTileBoundaries);
    mapRef.current!.showTileBoundaries = !showTileBoundaries;
  };

  useEffect(() => {
    let protocol = new Protocol();
    maplibregl.addProtocol("pmtiles", protocol.tile);
    protocol.add(props.file); // this is necessary for non-HTTP sources

    const map = new maplibregl.Map({
      container: mapContainerRef.current!,
      hash: "map",
      zoom: 0,
      center: [0, 0],
      style: {
        version: 8,
        sources: {},
        layers: [],
      },
    });
    map.addControl(new maplibregl.NavigationControl({}), "bottom-left");
    map.on("load", map.resize);

    const popup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
    });

    mapRef.current = map;

    map.on("mousemove", (e) => {
      if (!showAttributesRef.current) {
        popup.remove();
        return;
      }
      var bbox = e.point;

      var features = map.queryRenderedFeatures(bbox);

      // ignore the basemap
      features = features.filter((feature) => feature.source === "source");

      map.getCanvas().style.cursor = features.length ? "pointer" : "";

      let content = renderToString(<FeaturesProperties features={features} />);
      if (!features.length) {
        popup.remove();
      } else {
        popup.setHTML(content);
        popup.setLngLat(e.lngLat);
        popup.addTo(map);
      }
    });

    return () => {
      map.remove();
    };
  }, []);

  useEffect(() => {
    let initStyle = async () => {
      if (mapRef.current) {
        let map = mapRef.current;
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
          let style = await rasterStyle(props.file);
          map.setStyle(style);
        } else {
          let style = await vectorStyle(props.file);
          map.setStyle(style);
        }
      }
    };

    initStyle();
  }, []);

  return (
    <MapContainer ref={mapContainerRef}>
      <div ref={mapContainerRef}></div>
      <Hamburger onClick={toggleHamburger}>menu</Hamburger>
      {hamburgerOpen ? (
        <Options>
          <h4>Filter</h4>
          <h4>Popup</h4>
          <input
            type="checkbox"
            id="showAttributes"
            checked={showAttributes}
            onChange={toggleShowAttributes}
          />
          <label htmlFor="showAttributes">show attributes</label>
          <h4>Tiles</h4>
          <input
            type="checkbox"
            id="showTileBoundaries"
            checked={showTileBoundaries}
            onChange={toggleShowTileBoundaries}
          />
          <label htmlFor="showTileBoundaries">show tile boundaries</label>
        </Options>
      ) : null}
    </MapContainer>
  );
}

export default MaplibreMap;
