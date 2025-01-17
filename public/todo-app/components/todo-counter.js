import { createComponent, html, get } from "../../blink/index.js";
import { todos } from "../todos.js";

function countDone() {
  return get(todos).filter((t) => t.done).length;
}

export default createComponent(
  "todo-counter",
  html`<div>
    <p>{{ countDone }}</p>
  </div>`,
  {
    todos,
    countDone,
  },
);
