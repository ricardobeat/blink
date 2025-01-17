import { get, set, value } from "../blink/index.js";

export let todos = value([
  { name: "Buy milk", done: false },
  { name: "Buy bacon", done: false },
  { name: "Write todo app bacon", done: true },
]);

export function addTodo(name) {
  get(todos).push({ name, done: false });
}

export function toggle(e, { todo }) {
  todo.done = !todo.done;
  set(todos);
}

export function allDone() {
  for (let t of get(todos)) {
    t.done = true;
  }
}

export function allNotDone() {
  for (let t of get(todos)) {
    t.done = false;
  }
}
