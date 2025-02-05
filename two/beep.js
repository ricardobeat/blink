import { html } from "./html.js";

// export let $state = { count: 0 };
export let count = 0;

export function increment() {
  // $state.count++;
  count++;
}

export default function Beep() {
  return html`<div>
    <p>${count}</p>
    <button on:click=${increment}>+</button>
  </div>`;
}
