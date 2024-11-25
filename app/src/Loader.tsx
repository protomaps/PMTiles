import { useState } from "react";
import { PMTiles } from "../../js/src/index";
import { styled } from "./stitches.config";

import MaplibreMap from "./MaplibreMap";
import Metadata from "./Metadata";

import { MagnifyingGlassIcon } from "@radix-ui/react-icons";
import * as ToolbarPrimitive from "@radix-ui/react-toolbar";

const StyledToolbar = styled(ToolbarPrimitive.Root, {
  display: "flex",
  height: "$4",
  width: "100%",
  boxSizing: "border-box",
  minWidth: "max-content",
  backgroundColor: "white",
  boxShadow: `0 2px 10px "black"`,
});

const itemStyles = {
  all: "unset",
  flex: "0 0 auto",
  color: "$black",
  display: "inline-flex",
  padding: "0 $1 0 $1",
  fontSize: "$2",
  alignItems: "center",
  "&:hover": { backgroundColor: "$hover", color: "$white" },
  "&:focus": { position: "relative", boxShadow: "0 0 0 2px blue" },
};

const StyledLink = styled(
  ToolbarPrimitive.Link,
  {
    ...itemStyles,
    backgroundColor: "transparent",
    color: "black",
    display: "inline-flex",
    justifyContent: "center",
    alignItems: "center",
  },
  {
    "&:hover": {
      backgroundColor: "$hover",
      color: "$white",
      cursor: "pointer",
    },
  }
);

const StyledToggleGroup = styled(ToolbarPrimitive.ToggleGroup, {
  display: "inline-flex",
  borderRadius: 4,
});

const StyledToggleItem = styled(ToolbarPrimitive.ToggleItem, {
  ...itemStyles,
  boxShadow: 0,
  backgroundColor: "white",
  marginLeft: 2,
  cursor: "pointer",
  "&:first-child": { marginLeft: 0 },
  "&[data-state=on]": { backgroundColor: "$primary", color: "$primaryText" },
});

const Toolbar = StyledToolbar;
const ToolbarLink = StyledLink;
const ToolbarToggleGroup = StyledToggleGroup;
const ToolbarToggleItem = StyledToggleItem;

function Loader(props: { file: PMTiles; mapHashPassed: boolean }) {
  const [tab, setTab] = useState("maplibre");

  let view: any;
  if (tab === "maplibre") {
    view = (
      <MaplibreMap file={props.file} mapHashPassed={props.mapHashPassed} />
    );
  } else {
    view = <Metadata file={props.file} />;
  }

  return (
    <>
      <Toolbar aria-label="Formatting options">
        <ToolbarToggleGroup
          type="single"
          defaultValue="center"
          aria-label="Text alignment"
          value={tab}
          onValueChange={setTab}
        >
          <ToolbarToggleItem value="maplibre" aria-label="Right aligned">
            Map View
          </ToolbarToggleItem>
          <ToolbarToggleItem value="metadata" aria-label="Left aligned">
            Metadata
          </ToolbarToggleItem>
        </ToolbarToggleGroup>
        <ToolbarLink href={`tileinspect/?url=${props.file.source.getKey()}`}>
          🔎 Tile Inspector
        </ToolbarLink>
        <ToolbarLink css={{ marginRight: 10 }}>
          {props.file.source.getKey()}
        </ToolbarLink>
      </Toolbar>

      {view}
    </>
  );
}

export default Loader;
