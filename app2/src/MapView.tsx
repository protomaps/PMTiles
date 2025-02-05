/* @refresh reload */
import { render } from "solid-js/web";
import "./index.css";

function MapView() {
  return (
    <>
      <h1 class="text-xl">Map view</h1>
    </>
  );
}

const root = document.getElementById("root");

if (root) {
  render(() => <MapView />, root);
}
