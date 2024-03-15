import * as DialogPrimitive from "@radix-ui/react-dialog";
import { GitHubLogoIcon } from "@radix-ui/react-icons";
import React, { useState, useEffect } from "react";
import { PMTiles } from "../../js/index";
import { globalStyles, styled } from "./stitches.config";

import Loader from "./Loader";
import Start from "./Start";

const Header = styled("div", {
  height: "$4",
  display: "flex",
  alignItems: "center",
  padding: "0 $2 0 $2",
});

const Title = styled("a", {
  fontWeight: 500,
  color: "unset",
  textDecoration: "none",
});

const GithubA = styled("a", {
  color: "white",
  textDecoration: "none",
  fontSize: "$1",
});

const GithubLink = styled("span", {
  marginLeft: "auto",
});

const StyledOverlay = styled(DialogPrimitive.Overlay, {
  backgroundColor: "black",
  position: "fixed",
  inset: 0,
  opacity: "40%",
  zIndex: 3,
});

const StyledContent = styled(DialogPrimitive.Content, {
  backgroundColor: "black",
  color: "#ef4444",
  padding: "$1",
  borderRadius: 6,
  position: "fixed",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "90vw",
  zIndex: 4,
  "&:focus": { outline: "none" },
});

const GIT_SHA = (import.meta.env.VITE_GIT_SHA || "").substr(0, 8);

function MapViewComponent() {
  globalStyles();

  const [errorDisplay, setErrorDisplay] = useState<string | undefined>();
  const [file, setFile] = useState<PMTiles | undefined>();
  const [mapHashPassed, setMapHashPassed] = useState<boolean>(false);

  // initial load
  useEffect(() => {
    const loadUrl = new URLSearchParams(location.search).get("url");
    if (loadUrl) {
      const initialValue = new PMTiles(loadUrl);
      setFile(initialValue);
    }
    if (location.hash.includes("map")) {
      setMapHashPassed(true);
    }
  }, []);

  useEffect(() => {
    if (file) {
      file.getHeader().catch((e) => {
        setErrorDisplay(e.message);
      });
    }
  }, [file]);

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

  const clear = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    setFile(undefined);
  };

  const closeModal = () => {
    setErrorDisplay(undefined);
  };

  return (
    <div>
      <Header>
        <Title href="/PMTiles/" onClick={clear}>
          PMTiles Viewer
        </Title>
        <GithubLink>
          <GithubA href="https://github.com/protomaps/PMTiles" target="_blank">
            <GitHubLogoIcon /> {GIT_SHA}
          </GithubA>
        </GithubLink>
      </Header>
      {file ? (
        <Loader file={file} mapHashPassed={mapHashPassed} />
      ) : (
        <Start setFile={setFile} />
      )}
      <DialogPrimitive.Root open={errorDisplay !== undefined}>
        <DialogPrimitive.Portal>
          <StyledOverlay />
          <StyledContent
            onEscapeKeyDown={closeModal}
            onPointerDownOutside={closeModal}
          >
            <div>{file ? file.source.getKey() : null}</div>
            <div>{errorDisplay}</div>
            <DialogPrimitive.Close />
          </StyledContent>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  );
}

export default MapViewComponent;
