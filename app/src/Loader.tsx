import { useState, useEffect } from "react";
import { PMTiles } from "../../js";
import { styled } from "./stitches.config";

import Inspector from "./Inspector";
import LeafletMap from "./LeafletMap";
import MaplibreMap from "./MaplibreMap";

import { MagnifyingGlassIcon, ImageIcon } from "@radix-ui/react-icons";
import * as ToolbarPrimitive from "@radix-ui/react-toolbar";
import * as DialogPrimitive from "@radix-ui/react-dialog";

const StyledToolbar = styled(ToolbarPrimitive.Root, {
  display: "flex",
  padding: 10,
  width: "100%",
  boxSizing: "border-box",
  minWidth: "max-content",
  borderRadius: 6,
  backgroundColor: "white",
  boxShadow: `0 2px 10px "black"`,
});

const itemStyles = {
  all: "unset",
  flex: "0 0 auto",
  color: "black",
  height: 25,
  padding: "0 5px",
  borderRadius: 4,
  display: "inline-flex",
  fontSize: 13,
  lineHeight: 1,
  alignItems: "center",
  justifyContent: "center",
  "&:hover": { backgroundColor: "$hover", color: "blue" },
  "&:focus": { position: "relative", boxShadow: `0 0 0 2px blue` },
};

const StyledButton = styled(
  ToolbarPrimitive.Button,
  {
    ...itemStyles,
    paddingLeft: 10,
    paddingRight: 10,
    color: "white",
    backgroundColor: "blue",
  },
  { "&:hover": { color: "white", backgroundColor: "red" } }
);

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
  { "&:hover": { backgroundColor: "transparent", cursor: "pointer" } }
);

const StyledSeparator = styled(ToolbarPrimitive.Separator, {
  width: 1,
  backgroundColor: "black",
  margin: "0 10px",
});

const StyledToggleGroup = styled(ToolbarPrimitive.ToggleGroup, {
  display: "inline-flex",
  borderRadius: 4,
});

const StyledToggleItem = styled(ToolbarPrimitive.ToggleItem, {
  ...itemStyles,
  boxShadow: 0,
  backgroundColor: "white",
  marginLeft: 2,
  "&:first-child": { marginLeft: 0 },
  "&[data-state=on]": { backgroundColor: "red", color: "blue" },
});

const StyledOverlay = styled(DialogPrimitive.Overlay, {
  backgroundColor: "black",
  position: "fixed",
  inset: 0,
  opacity: "40%",
  zIndex: 3,
});

const StyledContent = styled(DialogPrimitive.Content, {
  backgroundColor: "white",
  borderRadius: 6,
  boxShadow:
    "hsl(206 22% 7% / 35%) 0px 10px 38px -10px, hsl(206 22% 7% / 20%) 0px 10px 20px -15px",
  position: "fixed",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "90vw",
  maxWidth: "450px",
  maxHeight: "85vh",
  padding: 25,
  zIndex: 4,
  "&:focus": { outline: "none" },
});

const Toolbar = StyledToolbar;
const ToolbarButton = StyledButton;
const ToolbarSeparator = StyledSeparator;
const ToolbarLink = StyledLink;
const ToolbarToggleGroup = StyledToggleGroup;
const ToolbarToggleItem = StyledToggleItem;

function Loader(props: { file: PMTiles }) {
  let [tab, setTab] = useState("inspector");
  let [tileType, setTileType] = useState<string | null>(null);
  let [metadata, setMetadata] = useState<[string, string][]>([]);
  let [modalOpen, setModalOpen] = useState<boolean>(false);

  let view;
  if (tab === "leaflet") {
    view = <LeafletMap file={props.file} tileType={tileType} />;
  } else if (tab === "maplibre") {
    view = <MaplibreMap file={props.file} tileType={tileType} />;
  } else {
    view = <Inspector file={props.file} />;
  }

  useEffect(() => {
    let pmtiles = props.file;
    const fetchData = async () => {
      let m = await pmtiles.metadata();
      let tmp: [string, string][] = [];
      for (var key in m) {
        tmp.push([key, m[key]]);
      }
      setMetadata(tmp);

      let magic = await props.file.source.getBytes(512000, 4);
      let b0 = magic.getUint8(0);
      let b1 = magic.getUint8(1);
      let b2 = magic.getUint8(2);
      let b3 = magic.getUint8(3);

      if (b0 == 0x89 && b1 == 0x50 && b2 == 0x4e && b3 == 0x47) {
        setTileType("png");
      } else if (b0 == 0xff && b1 == 0xd8 && b2 == 0xff && b3 == 0xe0) {
        setTileType("jpg");
      } else if (b0 == 0x1f && b1 == 0x8b) {
        setTileType("mvt.gz");
      } else {
        setTileType("mvt");
      }
    };
    fetchData();
  }, [props.file]);

  const metadataRows = metadata.map((d, i) => (
    <tr key={i}>
      <td>{d[0]}</td>
      <td>{d[1]}</td>
    </tr>
  ));

  const closeModal = () => {
    setModalOpen(false);
  };

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
          <ToolbarToggleItem value="inspector" aria-label="Left aligned">
            <MagnifyingGlassIcon /> Tile Inspector
          </ToolbarToggleItem>
          <ToolbarToggleItem value="leaflet" aria-label="Center aligned">
            Leaflet
          </ToolbarToggleItem>
          <ToolbarToggleItem value="maplibre" aria-label="Right aligned">
            MapLibre
          </ToolbarToggleItem>
        </ToolbarToggleGroup>
        <ToolbarSeparator />
        <ToolbarLink href="#" target="_blank" css={{ marginRight: 10 }}>
          {props.file.source.getKey()}
        </ToolbarLink>
        <ToolbarButton
          css={{ marginLeft: "auto" }}
          onClick={() => setModalOpen(true)}
        >
          Metadata
        </ToolbarButton>
      </Toolbar>

      <DialogPrimitive.Root open={modalOpen}>
        <DialogPrimitive.Trigger />
        <DialogPrimitive.Portal>
          <StyledOverlay />
          <StyledContent
            onEscapeKeyDown={closeModal}
            onPointerDownOutside={closeModal}
          >
            <DialogPrimitive.Title />
            <DialogPrimitive.Description />
            <table>
              <thead>
                <tr>
                  <th>key</th>
                  <th>value</th>
                </tr>
              </thead>
              <tbody>{metadataRows}</tbody>
            </table>
            <DialogPrimitive.Close />
          </StyledContent>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
      {view}
    </>
  );
}

export default Loader;
