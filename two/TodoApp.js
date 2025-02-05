import { html, each } from "./html.js";
import { css } from "./css.js";

export let todos = [
  { name: "Publish this library", done: false },
  { name: "Buy milk", done: true },
];

// cannot render this as controlled input
// since we lose state in the DOM every render
// let text = "";

// function setText(value) {
//   console.log("setText", value);
//   text = value;
// }

function addTodo(e, { refs }) {
  todos.unshift({ name: refs.input.value, done: false });
}

function setDone(todo) {
  todo.done = true;
}

// how to have children components?
const TodoApp = () =>
  html`<div>
    <h1>Todo App</h1>
    <div class="todos">
      <TodoList todos=${todos.filter((t) => !t.done)} />
      <TodoList todos=${todos.filter((t) => t.done)} />
    </div>
    <input type="text" ref:input />
    <button on:click="${addTodo}">Add todo</button>
    <style>
      .todos {
        margin-bottom: 20px;
      }
      ul {
        margin: 0;
      }
    </style>
  </div>`;

export const TodoList = ({ todos }) =>
  html`<div class="todo-list">
    <ul>
      ${each(todos, (todo) => TodoItem(todo))}
    </ul>
  </div>`;

export const TodoItem = (todo) =>
  html`<li class=${[todo.done && "done"]}>
    <label>
      <input
        type="checkbox"
        checked=${todo.done}
        disabled=${todo.done}
        on:change="${() => setDone(todo)}"
      />
      ${todo.name}
    </label>
    <style>
      .done {
        text-decoration: line-through;
        color: blue;
      }
    </style>
  </li>`;

export default TodoApp;

export const styles = css`
  p {
    color: red;
  }
`;
