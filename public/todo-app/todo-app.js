import { createComponent, html } from "../blink/index.js";

import "./components/todo-item.js";
import "./components/todo-list.js";
import "./components/todo-counter.js";
import "./components/floating-counter.js";
import "./components/app-footer.js";

export default createComponent(
  "todo-app",
  html`<div>
    <h1>Todo App</h1>
    <todo-list></todo-list>
    <todo-counter></todo-counter>
    <floating-counter></floating-counter>
    <app-footer /></app-footer>
  </div> `,
);
