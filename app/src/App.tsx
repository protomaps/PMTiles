import { useState, useEffect } from "react";
import { styled, globalStyles } from "./stitches.config";
import { PMTiles } from "../../js";

import Start from "./Start";
import Loader from "./Loader";

const Header = styled("div", {
  height: "$4",
});

const GIT_SHA = (import.meta.env.VITE_GIT_SHA || "").substr(0, 8);

function App() {
  globalStyles();

  let initialValue;
  const loadUrl = new URLSearchParams(location.search).get("url");
  if (loadUrl) {
    initialValue = new PMTiles(loadUrl);
  }

  let [file, setFile] = useState<PMTiles | undefined>(initialValue);

  useEffect(() => {
    if (file) {
      const url = new URL(window.location.href);
      url.searchParams.set("url", file.source.getKey());
      history.pushState(null, "", url.toString());
    }
  }, [file]);

  let clear = () => {
    setFile(undefined);
  };

  return (
    <div>
      <Header>
        <span onClick={clear}>pmtiles viewer</span> | github | toggle |{" "}
        {GIT_SHA}
      </Header>
      {file ? <Loader file={file} /> : <Start setFile={setFile} />}
    </div>
  );
}

export default App;
