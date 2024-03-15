import React, { useState, useEffect } from "react";
import { PMTiles } from "../../js/index";
import { globalStyles, styled } from "./stitches.config";
import Inspector from "./Inspector";
import Start from "./Start";

function TileInspectComponent() {
  globalStyles();

  const [file, setFile] = useState<PMTiles | undefined>();

  // initial load
  useEffect(() => {
    const loadUrl = new URLSearchParams(location.search).get("url");
    if (loadUrl) {
      const initialValue = new PMTiles(loadUrl);
      setFile(initialValue);
    }
  }, []);

  // maintaining URL state
  useEffect(() => {
    const url = new URL(window.location.href);
    if (file?.source.getKey().startsWith("http")) {
      url.searchParams.set("url", file.source.getKey());
      history.pushState(null, "", url.toString());
    } else {
      url.searchParams.delete("url");
      history.pushState(null, "", url.toString());
    }
  }, [file]);

  return (
    <div>{file ? <Inspector file={file} /> : <Start setFile={setFile} />}</div>
  );
}

export default TileInspectComponent;
