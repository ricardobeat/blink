import { createComponent, html, get } from "../../blink/index.js";
import { todos, allDone, allNotDone, addTodo } from "../todos.js";

function onEnter(e) {
  if (e.key === "Enter") {
    addTodo(e.currentTarget.value);
    e.currentTarget.value = "";
  }
}

export default createComponent(
  "todo-list",
  html`
    <div class="todo-list">
      <div>
        <input type="text" placeholder="Add new todo" on:keydown="{onEnter}" />
      </div>
      <ul for="{todos}" as="{todo}">
        <todo-item></todo-item>
      </ul>
      <div>
        <button on:click="{allDone}">Mark all as done</button>
        <button on:click="{allNotDone}">Mark all as to do</button>
      </div>
    </div>
  `,
  {
    todos,
    allDone,
    allNotDone,
    onEnter,
  },
);
