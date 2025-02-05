import { html } from "./html.js";

export let items = ["a", "b", "c"];

export function addItem() {
  items.push((Math.random() * 100) | 0);
}

export function remove(item) {
  items = items.filter((i) => i !== item);
}

export function clear() {
  items = [];
}

export default function List() {
  return html`<div>
    <ul>
      ${items.length
        ? items.map(
            (item) =>
              html`<li>
                <span>${item}</span>
                <button on:click=${() => remove(item)}>Remove</button>
              </li>`,
          )
        : "No items"}
    </ul>
    <button on:click=${addItem}>New item</button>
    <button on:click=${clear}>Clear</button>
  </div>`;
}
