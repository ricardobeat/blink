import { createComponent, html, set, value } from "../../blink/index.js";

let count = value(0);

function increment() {
  set(count, (c) => c + 1);
}

function decrement() {
  set(count, (c) => c - 1);
}

export default createComponent(
  "floating-counter",
  html`<div class="floating-counter">
    <p>{{ count }}</p>
    <button on:click="{increment}">+</button>
    <button on:click="{decrement}">-</button>
  </div>`,
  {
    increment,
    decrement,
    count,
  },
);
