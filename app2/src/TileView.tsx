/* @refresh reload */
import { render } from "solid-js/web";
import "./index.css";

function TileView() {
  return (
    <>
      <h1 class="text-xl">Tile inspector</h1>
    </>
  );
}

const root = document.getElementById("root");

if (root) {
  render(() => <TileView />, root);
}
