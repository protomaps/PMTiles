import React from "react";
import reactDom from "react-dom/client";
import MapViewComponent from "./MapViewComponent";

const root = document.getElementById("root");
if (root) {
  reactDom.createRoot(root).render(
    <React.StrictMode>
      <MapViewComponent />
    </React.StrictMode>
  );
}
