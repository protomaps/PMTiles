/* @refresh reload */
import { render } from "solid-js/web";
import "./index.css";

function Archive() {
  return (
    <>
      <h1 class="text-xl">Archive inspector</h1>
    </>
  );
}

const root = document.getElementById("root");

if (root) {
  render(() => <Archive />, root);
}
