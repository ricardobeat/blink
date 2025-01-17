import { createComponent, html } from "../../blink/index.js";
import { toggle } from "../todos.js";

export default createComponent(
  "todo-item",
  html`
    <li>
      <label
        ><input type="checkbox" :checked="{todo.done}" on:change:toggle />
        {{todo.name}}</label
      >
    </li>
  `,
  { toggle },
);
