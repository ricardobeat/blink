import { createComponent, html, value, set } from "../../blink/index.js";

let debugging = value(false);

function toggleDebug() {
  set(debugging, (value) => !value);
  document.body.classList.toggle("renderDebug", debugging.value);
}

export default createComponent(
  "app-footer",
  html`
    <div class="footer">
      <input type="checkbox" :checked="{debugging}" on:change="{toggleDebug}" />
      <button on:click="{toggleDebug}">show renders</button>
    </div>
  `,
  { debugging, toggleDebug },
);
