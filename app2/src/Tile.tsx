/* @refresh reload */
import { render } from "solid-js/web";
import './index.css'

function Tile() {
  return (
    <>
      <h1 class="text-xl">Vite + Solid</h1>
    </>
  )
}

const root = document.getElementById("root");

if (root) {
  render(() => <Tile />, root);
}
