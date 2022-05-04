import { useState, useEffect } from "react";
import { PMTiles, leafletLayer } from "../../js";
import { styled } from "./stitches.config";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const MapContainer = styled("div", {
  height: "calc(100vh - $4)",
});

function LeafletMap(props:{file:string}) {
  const p = new PMTiles(
    "https://protomaps-static.sfo3.digitaloceanspaces.com/osm_carto.pmtiles"
  );

  useEffect(() => {
    const map = L.map("map").setView([0, 0], 0);
    leafletLayer(p, {
      attribution:
        '© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
    }).addTo(map);

    return () => {
      map.remove();
    };
  }, []);

  return <MapContainer id="map"></MapContainer>;
}

export default LeafletMap;
