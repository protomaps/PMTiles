import React, { useState, useEffect, useRef } from "react";
import { renderToString } from "react-dom/server";
import { PMTiles, TileType } from "../../js/index";
import { Protocol } from "../../js/adapters";
import { styled } from "./stitches.config";
import maplibregl from "maplibre-gl";
import { MapGeoJSONFeature } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { schemeSet3 } from "d3-scale-chromatic";
import base_theme from "protomaps-themes-base";
import {
  StyleSpecification,
  LayerSpecification,
} from "@maplibre/maplibre-gl-style-spec";

const INITIAL_ZOOM = 0;
const INITIAL_LNG = 0;
const INITIAL_LAT = 0;
const BASEMAP_URL =
  "https://api.protomaps.com/tiles/v3/{z}/{x}/{y}.mvt?key=1003762824b9687f";
const BASEMAP_ATTRIBUTION =
  'Basemap <a href="https://github.com/protomaps/basemaps">Protomaps</a> © <a href="https://openstreetmap.org">OpenStreetMap</a>';

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

const CheckboxLabel = styled("label", {
  display: "flex",
  gap: 6,
  cursor: "pointer",
});

const LayersVisibilityList = styled("ul", {
  listStyleType: "none",
});

const FeaturesProperties = (props: { features: MapGeoJSONFeature[] }) => {
  return (
    <PopupContainer>
      {props.features.map((f, i) => (
        <FeatureRow key={i}>
          <span>
            <strong>{(f.layer as any)["source-layer"]}</strong>
            <span style={{ fontSize: "0.8em" }}> ({f.geometry.type})</span>
          </span>
          <table>
            {Object.entries(f.properties).map(([key, value], i) => (
              <tr key={i}>
                <td>{key}</td>
                <td>
                  {typeof value === "boolean" ? JSON.stringify(value) : value}
                </td>
              </tr>
            ))}
          </table>
        </FeatureRow>
      ))}
    </PopupContainer>
  );
};

interface LayerVisibility {
  id: string;
  visible: boolean;
}

const LayersVisibilityController = (props: {
  layers: LayerVisibility[];
  onChange: (layers: LayerVisibility[]) => void;
}) => {
  const { layers, onChange } = props;
  const allLayersCheckboxRef = useRef<HTMLInputElement>(null);
  const visibleLayersCount = layers.filter((l) => l.visible).length;
  const indeterminate =
    visibleLayersCount > 0 && visibleLayersCount !== layers.length;

  useEffect(() => {
    if (allLayersCheckboxRef.current) {
      allLayersCheckboxRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  if (!props.layers.length) {
    return (
      <>
        <h4>Layers</h4>
        <span>No vector layers found</span>
      </>
    );
  }

  const toggleAllLayers = () => {
    const visible = visibleLayersCount !== layers.length;
    const newLayersVisibility = layers.map((l) => ({ ...l, visible }));
    onChange(newLayersVisibility);
  };

  const toggleLayer = (event: React.ChangeEvent<HTMLInputElement>) => {
    const layerId = event.target.getAttribute("data-layer-id");
    const newLayersVisibility = layers.map((l) =>
      l.id === layerId ? { ...l, visible: !l.visible } : l
    );
    onChange(newLayersVisibility);
  };

  return (
    <>
      <h4>Layers</h4>
      <CheckboxLabel>
        <input
          ref={allLayersCheckboxRef}
          type="checkbox"
          checked={visibleLayersCount === layers.length}
          onChange={toggleAllLayers}
        />
        <em>All layers</em>
      </CheckboxLabel>
      <LayersVisibilityList>
        {props.layers.map(({ id, visible }, idx) => (
          <li key={id}>
            <CheckboxLabel style={{ paddingLeft: 8 }}>
              <input
                type="checkbox"
                checked={visible}
                onChange={toggleLayer}
                data-layer-id={id}
              />
              <span
                style={{
                  width: ".8rem",
                  height: ".8rem",
                  backgroundColor: schemeSet3[idx % 12],
                }}
              />
              {id}
            </CheckboxLabel>
          </li>
        ))}
      </LayersVisibilityList>
    </>
  );
};

const rasterStyle = async (file: PMTiles): Promise<StyleSpecification> => {
  let header = await file.getHeader();
  let metadata = await file.getMetadata();
  let layers: LayerSpecification[] = [];

  if (metadata.type !== "baselayer") {
    layers = base_theme("basemap", "black");
  }

  layers.push({
    id: "raster",
    type: "raster",
    source: "source",
  });

  return {
    version: 8,
    sources: {
      source: {
        type: "raster",
        tiles: ["pmtiles://" + file.source.getKey() + "/{z}/{x}/{y}"],
        minzoom: header.minZoom,
        maxzoom: header.maxZoom,
      },
      basemap: {
        type: "vector",
        tiles: [BASEMAP_URL],
        maxzoom: 15,
        attribution: BASEMAP_ATTRIBUTION,
      },
    },
    glyphs: "https://cdn.protomaps.com/fonts/pbf/{fontstack}/{range}.pbf",
    layers: layers,
  };
};

const vectorStyle = async (
  file: PMTiles
): Promise<{
  style: StyleSpecification;
  layersVisibility: LayerVisibility[];
}> => {
  let header = await file.getHeader();
  let metadata = await file.getMetadata();
  let layers: LayerSpecification[] = [];
  let baseOpacity = 0.35;

  if (metadata.type !== "baselayer") {
    layers = base_theme("basemap", "black");
    baseOpacity = 0.9;
  }

  var tilestats: any;
  var vector_layers: LayerSpecification[];
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
          "fill-opacity": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            baseOpacity,
            baseOpacity - 0.15,
          ],
          "fill-outline-color": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            "hsl(0,100%,90%)",
            "rgba(0,0,0,0.2)",
          ],
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
          "line-width": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            2,
            0.5,
          ],
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
          "circle-radius": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            6,
            5,
          ],
        },
        filter: ["==", ["geometry-type"], "Point"],
      });
    }
  }

  const bounds: [number, number, number, number] = [
    header.minLon,
    header.minLat,
    header.maxLon,
    header.maxLat,
  ];

  return {
    style: {
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
          tiles: [BASEMAP_URL],
          maxzoom: 15,
          bounds: bounds,
          attribution: BASEMAP_ATTRIBUTION,
        },
      },
      glyphs: "https://cdn.protomaps.com/fonts/pbf/{fontstack}/{range}.pbf",
      layers: layers,
    },
    layersVisibility: vector_layers.map((l: LayerSpecification) => ({
      id: l.id,
      visible: true,
    })),
  };
};

function MaplibreMap(props: { file: PMTiles; mapHashPassed: boolean }) {
  let mapContainerRef = useRef<HTMLDivElement>(null);
  let [hamburgerOpen, setHamburgerOpen] = useState<boolean>(true);
  let [showAttributes, setShowAttributes] = useState<boolean>(false);
  let [showTileBoundaries, setShowTileBoundaries] = useState<boolean>(false);
  let [layersVisibility, setLayersVisibility] = useState<LayerVisibility[]>([]);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const hoveredFeaturesRef = useRef<Set<MapGeoJSONFeature>>(new Set());

  // make it accessible in hook
  const showAttributesRef = useRef(showAttributes);
  useEffect(() => {
    showAttributesRef.current = showAttributes;
  }, [showAttributes]);

  const toggleHamburger = () => {
    setHamburgerOpen(!hamburgerOpen);
  };

  const toggleShowAttributes = () => {
    setShowAttributes(!showAttributes);
    mapRef.current!.getCanvas().style.cursor = !showAttributes
      ? "crosshair"
      : "";
  };

  const toggleShowTileBoundaries = () => {
    setShowTileBoundaries(!showTileBoundaries);
    mapRef.current!.showTileBoundaries = !showTileBoundaries;
  };

  const handleLayersVisibilityChange = (
    layersVisibility: LayerVisibility[]
  ) => {
    setLayersVisibility(layersVisibility);
    const map = mapRef.current!;
    for (const { id, visible } of layersVisibility) {
      const visibility = visible ? "visible" : "none";
      map.setLayoutProperty(`${id}_fill`, "visibility", visibility);
      map.setLayoutProperty(`${id}_stroke`, "visibility", visibility);
      map.setLayoutProperty(`${id}_point`, "visibility", visibility);
    }
  };

  useEffect(() => {
    let protocol = new Protocol();
    maplibregl.addProtocol("pmtiles", protocol.tile);
    protocol.add(props.file); // this is necessary for non-HTTP sources

    const map = new maplibregl.Map({
      container: mapContainerRef.current!,
      hash: "map",
      zoom: INITIAL_ZOOM,
      center: [INITIAL_LNG, INITIAL_LAT],
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
      maxWidth: "none",
    });

    mapRef.current = map;

    map.on("mousemove", (e) => {
      const hoveredFeatures = hoveredFeaturesRef.current;
      for (const feature of hoveredFeatures) {
        map.setFeatureState(feature, { hover: false });
        hoveredFeatures.delete(feature);
      }

      if (!showAttributesRef.current) {
        popup.remove();
        return;
      }

      const { x, y } = e.point;
      const r = 2; // radius around the point
      var features = map.queryRenderedFeatures([
        [x - r, y - r],
        [x + r, y + r],
      ]);

      // ignore the basemap
      features = features.filter((feature) => feature.source === "source");

      for (const feature of features) {
        map.setFeatureState(feature, { hover: true });
        hoveredFeatures.add(feature);
      }

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
        if (!props.mapHashPassed) {
          // the map hash was not passed, so auto-detect the initial viewport based on metadata
          map.fitBounds(
            [
              [header.minLon, header.minLat],
              [header.maxLon, header.maxLat],
            ],
            { animate: false }
          );
        }

        let style: StyleSpecification;
        if (
          header.tileType === TileType.Png ||
          header.tileType === TileType.Webp ||
          header.tileType == TileType.Jpeg
        ) {
          let style = await rasterStyle(props.file);
          map.setStyle(style);
        } else {
          let { style, layersVisibility } = await vectorStyle(props.file);
          map.setStyle(style);
          setLayersVisibility(layersVisibility);
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
          <CheckboxLabel>
            <input
              type="checkbox"
              checked={showAttributes}
              onChange={toggleShowAttributes}
            />
            show attributes
          </CheckboxLabel>
          <h4>Tiles</h4>
          <CheckboxLabel>
            <input
              type="checkbox"
              checked={showTileBoundaries}
              onChange={toggleShowTileBoundaries}
            />
            show tile boundaries
          </CheckboxLabel>
          <LayersVisibilityController
            layers={layersVisibility}
            onChange={handleLayersVisibilityChange}
          />
        </Options>
      ) : null}
    </MapContainer>
  );
}

export default MaplibreMap;
