/* @refresh reload */
import { render } from "solid-js/web";
import "./index.css";

// url parameters: url (cannot be tilejson, must be local or remote pmtiles)
function ArchiveView() {
  return (
    <>
      <h1 class="text-xl">Archive inspector</h1>
    </>
  );
}

const root = document.getElementById("root");

if (root) {
  render(() => <ArchiveView />, root);
}
