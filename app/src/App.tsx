import { useState, useEffect } from "react";
import { styled, globalStyles } from "./stitches.config";
import { PMTiles } from "../../js";
import { GitHubLogoIcon } from "@radix-ui/react-icons";

import Start from "./Start";
import Loader from "./Loader";

const Header = styled("div", {
  height: "$4",
  display: "flex",
  alignItems: "center",
  padding: "0 $2 0 $2",
});

const Title = styled("span", {
  fontWeight: 500,
  cursor: "pointer",
});

const GithubA = styled("a", {
  color: "white",
  textDecoration: "none",
  fontSize: "$1",
});

const GithubLink = styled("span", {
  marginLeft: "auto",
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
        <Title onClick={clear}>PMTiles Viewer</Title>
        <GithubLink>
          <GithubA href="https://github.com/protomaps/PMTiles" target="_blank">
            <GitHubLogoIcon /> {GIT_SHA}
          </GithubA>
        </GithubLink>
      </Header>
      {file ? <Loader file={file} /> : <Start setFile={setFile} />}
    </div>
  );
}

export default App;
