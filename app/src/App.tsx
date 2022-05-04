import { useState, useEffect } from "react";
import { styled, globalStyles } from "./stitches.config";

import Start from "./Start";
import Inspector from "./Inspector";
import LeafletMap from "./LeafletMap";
import MaplibreMap from "./MaplibreMap";

const Header = styled("div", {
  height: "$4",
});

function App() {
  globalStyles();

  const existingValue = new URLSearchParams(location.search).get("file") || "";

  let [file, setFile] = useState<string>(existingValue);

  useEffect(() => {
    if (file) {
      const url = new URL(window.location.href);
      url.searchParams.set("file", file);
      history.pushState(null, "", url.toString());
    }
  }, [file]);

  return (
    <div>
      <Header>pmtiles viewer | github | toggle</Header>
      {file ? <MaplibreMap file={file} /> : <Start setFile={setFile} />}
    </div>
  );
}

export default App;
