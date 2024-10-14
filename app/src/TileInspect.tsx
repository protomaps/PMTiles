// SPDX-FileCopyrightText: 2021 Protomaps LLC
//
// SPDX-License-Identifier: BSD-3-Clause

import React from "react";
import reactDom from "react-dom/client";
import TileInspectComponent from "./TileInspectComponent";

const root = document.getElementById("root");
if (root) {
  reactDom.createRoot(root).render(
    <React.StrictMode>
      <TileInspectComponent />
    </React.StrictMode>
  );
}
