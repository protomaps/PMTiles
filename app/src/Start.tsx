import { Dispatch, SetStateAction, useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { FileSource, PMTiles } from "../../js/index";
import { styled } from "./stitches.config";

import * as LabelPrimitive from "@radix-ui/react-label";

const Input = styled("input", {
  all: "unset",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "$3",
  fontFamily: "$sans",
  "&:focus": { boxShadow: "0 0 0 1px black" },
  width: "100%",
  border: "1px solid $white",
  padding: "$1",
  boxSizing: "border-box",
  margin: "0 0 $2 0",
  borderRadius: "$2",
});

const Label = styled(LabelPrimitive.Root, {
  display: "block",
  fontSize: "$3",
  fontWeight: 300,
  userSelect: "none",
  padding: "0 0 $1 0",
});

const Header = styled("h1", {
  paddingBottom: "$1",
  fontWeight: 500,
});

const Container = styled("div", {
  maxWidth: 780,
  marginLeft: "auto",
  marginRight: "auto",
  padding: "$3",
});

const Button = styled("button", {
  padding: "$1 $2",
  marginBottom: "$1",
  borderRadius: "$2",
  cursor: "pointer",
  variants: {
    color: {
      violet: {
        backgroundColor: "blueviolet",
        color: "white",
        "&:hover": {
          backgroundColor: "darkviolet",
        },
      },
      gray: {
        backgroundColor: "gainsboro",
        "&:hover": {
          backgroundColor: "lightgray",
        },
      },
    },
  },
});

const Dropzone = styled("div", {
  padding: "$2",
  border: "1px dashed $white",
  textAlign: "center",
  margin: "0 0 $2 0",
});

const Example = styled("div", {
  padding: "$1",
  "&:not(:last-child)": {
    borderBottom: "1px solid $white",
  },
  "&:hover": {
    backgroundColor: "$hover",
  },
  variants: {
    selected: {
      true: {
        backgroundColor: "red",
      },
    },
  },
});

const ExampleList = styled("div", {
  borderRadius: "$1",
  border: "1px solid $white",
  margin: "0 0 $2 0",
});

const EXAMPLE_FILES = [
  "https://data.source.coop/protomaps/openstreetmap/tiles/v3.pmtiles",
  "https://pmtiles.io/stamen_toner(raster)CC-BY+ODbL_z3.pmtiles",
  "https://r2-public.protomaps.com/protomaps-sample-datasets/cb_2018_us_zcta510_500k.pmtiles",
  "https://pmtiles.io/usgs-mt-whitney-8-15-webp-512.pmtiles",
];

function Start(props: {
  setFile: Dispatch<SetStateAction<PMTiles | undefined>>;
}) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    props.setFile(new PMTiles(new FileSource(acceptedFiles[0])));
  }, []);

  const { acceptedFiles, getRootProps, getInputProps } = useDropzone({
    onDrop,
  });

  const [remoteUrl, setRemoteUrl] = useState<string>("");
  const [selectedExample, setSelectedExample] = useState<number | null>(1);

  const onRemoteUrlChangeHandler = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setRemoteUrl(event.target.value);
  };

  const loadExample = (i: number) => {
    return () => {
      props.setFile(new PMTiles(EXAMPLE_FILES[i]));
    };
  };

  const onSubmit = () => {
    props.setFile(new PMTiles(remoteUrl));
  };

  return (
    <Container>
      <Header>PMTiles Viewer</Header>
      <Label htmlFor="remoteUrl">Specify a remote URL</Label>
      <Input
        id="remoteUrl"
        placeholder="https://example.com/my_archive.pmtiles"
        onChange={onRemoteUrlChangeHandler}
      />
      <Button color="gray" onClick={onSubmit} disabled={!remoteUrl.trim()}>
        Load URL
      </Button>
      <Label htmlFor="localFile">Select a local file</Label>
      <Dropzone {...getRootProps()}>
        <input {...getInputProps()} />
        <p>Drag + drop a file here, or click to select</p>
      </Dropzone>
      <Label>Load an example</Label>
      <ExampleList>
        {EXAMPLE_FILES.map((e, i) => (
          <Example key={i} onClick={loadExample(i)}>
            {e}
          </Example>
        ))}
      </ExampleList>
    </Container>
  );
}

export default Start;
