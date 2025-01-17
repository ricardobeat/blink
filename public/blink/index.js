import { Signal, value } from "./signals.js";
import {
  getComponents,
  createComponent,
  registry,
  registryDefaultProps,
  ComponentDefinition,
} from "./components.js";

export { value, createComponent };

let DEBUG =
  (typeof window !== "undefined" &&
    window.location.search.includes("debug=")) ||
  false;

let currentRenderingNode = null;
let initialized = false;
let running = false;
let dependencyMap = new Map();
let depth = 0;

let dirty = new Map();

// get(signal)
// returns signal value and starts tracking it as a dependency
export function get(o) {
  dirty.set(o, o.value);
  if (currentRenderingNode) trackDependency(o, currentRenderingNode);
  tick();
  DEBUG && console.log("-> get dirty", o, o.value);
  return o.value;
}

// set(signal)
// updates signal value
export function set(o, val) {
  let previousValue = o.value;
  dirty.set(o, previousValue);
  if (val) {
    // allow setting without value to force update
    o.value = typeof val === "function" ? val(previousValue) : val;
  }
  tick();
  DEBUG && console.log("-> set dirty", o, previousValue);
  return o.value;
}

const RenderMode = {
  REPLACE: "replace",
  APPEND: "append",
};

const SELF = "self";

//
// Render a component or template
//
// - {{ var }} expressions
// - for={arr} loops
// - on:event="{handler}" event listeners
// - :prop="{value}" attribute bindings
// - <component-name> nested components
//
export function render(id, target, inputProps = {}, mode = RenderMode.REPLACE) {
  depth++; // track recursion depth

  if (!initialized) {
    getComponents();
    initialized = true;
  }

  let componentRoot;

  if (id instanceof HTMLElement) {
    componentRoot = document.createDocumentFragment();
    componentRoot.append(id.cloneNode(true));
    target = id;
    id = id.tagName;
  } else if (id instanceof ComponentDefinition) {
    let def = id;
    id = def.id;
    componentRoot = def.template.content.cloneNode(true);
  } else {
    id = id.toLowerCase();
    componentRoot = registry[id].content.cloneNode(true);
  }

  // allow passing selector string as a render target
  if (typeof target === "string") {
    target = document.querySelector(target);
  }

  let dependencyKey = Symbol();
  let rootNode = componentRoot.firstElementChild;
  rootNode._templateId = id;
  rootNode._props = inputProps;
  rootNode._dependencyKey = dependencyKey;

  currentRenderingNode = rootNode;

  let props = { ...inputProps };
  let propsWithDefaults = { ...inputProps, ...registryDefaultProps[id] };
  let tasks = [];

  var walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_ELEMENT);
  while (walker.nextNode()) {
    let node = walker.currentNode;
    let tagName = node.tagName.toLowerCase();
    let skipChildren = false;

    for (let attr of node.attributes) {
      // EVENT handlers
      if (attr.name.startsWith("on:")) {
        let [_, event, _key] = attr.name.split(":");
        let key = _key || getExpressionKey(attr.value);
        let fn = getExpressionValue(key, propsWithDefaults);
        if (typeof fn !== "function") {
          throw new Error(
            `${key} is not a function. Did you forget to pass it as a prop to the ${id} component?`,
          );
        }
        node.addEventListener(event, (e) => fn.apply(null, [e, props]), false);
      }

      // FOR loop
      if (attr.name === "for") {
        skipChildren = true;
        let childElement = node.firstElementChild;
        let propName = getExpressionKey(attr.value);
        let eachName = getExpressionKey(node.getAttribute("as")) || SELF;
        let signal = getExpressionValue(propName, props);

        if (!signal) {
          throw new Error(
            `rendering error: missing ${propName} prop (rendering ${id})`,
          );
        }

        let arr = signal.value;

        if (!Array.isArray(arr)) {
          throw new Error(
            `rendering error: value must be an array (rendering ${id})`,
          );
        }

        tasks.push(() => trackDependency(signal, rootNode));

        let previousArr = dirty.get(signal);

        let extraPropKeys = [];
        for (let attr of childElement.attributes) {
          if (attr.name.startsWith(":")) {
            let pKey = attr.name.slice(1);
            let pValue = getExpressionKey(attr.value);
            extraPropKeys.push([pKey, pValue]);
          }
        }

        let isComponent = childElement.tagName.includes("-");
        childElement.remove();

        for (let key in arr) {
          let item = arr[key];
          let clone = childElement.cloneNode(true);
          let childProps = { ...propsWithDefaults };
          for (let [key, val] of extraPropKeys) {
            childProps[key] =
              val === SELF ? item : getExpressionValue(val, props);
          }
          childProps[eachName] = item;
          if (isComponent) {
            tasks.push(() => {
              render(childElement.tagName, node, childProps, RenderMode.APPEND);
            });
          } else {
            renderTemplate(clone, childProps, []);
            node.appendChild(clone);
          }
        }
      }
    }

    if (registry[tagName]) {
      tasks.push(() => render(tagName, node, props));
    } else {
      tasks.push(...renderTemplate(node, propsWithDefaults));
    }

    // when a for loop is used, rendering the children will be delegated
    // to the inner loop, so we can skip the children of the current node
    if (skipChildren) {
      walker.lastChild();
    }
  }

  switch (mode) {
    case RenderMode.REPLACE:
      target.replaceChildren(rootNode);
      break;
    case RenderMode.APPEND:
      target.appendChild(rootNode);
      break;
    default:
      throw new Error("undefined render mode");
  }

  tasks.forEach((t) => t());
  currentRenderingNode = null;

  // only start the rendering loop after the topmost component is rendered
  if (!running && --depth === 0) {
    running = true;
  }
}

// renders {{ expressions }} and :prop="{expression}" bindings
function renderTemplate(rootNode, props, skip = ["this"]) {
  let tasks = [];

  var walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    let node = walker.currentNode;
    let text = node.nodeValue;
    let matches = text?.match(/{{(.*?)}}/g);
    if (matches) {
      for (let m of matches) {
        let key = m.slice(2, -2).trim();
        if (!skip.includes(key)) {
          let value = resolveExpressionValue(key, props);
          if (value instanceof Signal) {
            tasks.push(() => trackDependency(value, rootNode));
            text = text.replace(m, value.value);
          }
          if (value === undefined) {
            value = DEBUG ? "(undefined)" : "";
          }
          text = text.replace(m, value);
        }
      }
      node.nodeValue = text;
    }
  }

  var walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_ELEMENT);
  let node = rootNode;
  while (node) {
    for (let attr of node.attributes) {
      if (attr.name.startsWith(":")) {
        let pKey = attr.name.slice(1);
        let signalOrValue = getExpressionValue(attr.value, props);
        let pValue = signalOrValue;
        if (signalOrValue instanceof Signal) {
          tasks.push(() => trackDependency(signalOrValue, rootNode));
          pValue = signalOrValue.value;
        }
        switch (pKey) {
          case "checked":
            node.checked = !!pValue;
            break;
          default:
            node.setAttribute(pKey, pValue);
        }
      }
    }
    node = walker.nextNode();
  }

  return tasks;
}

function getExpressionKey(expression) {
  return expression.replace(/[{}]/g, "");
}

function getPathValue(path, obj) {
  return path.split(".").reduce((acc, key) => acc[key], obj);
}

function getExpressionValue(expression, props = {}) {
  return getPathValue(getExpressionKey(expression), props);
}

function resolveExpressionValue(expression, props = {}) {
  let value = getExpressionValue(expression, props);
  return typeof value === "function" ? value() : value;
}

function trackDependency(signal, rootNode) {
  if (!(signal instanceof Signal)) {
    console.error("trackDependency expects a Signal", { signal, rootNode });
    return;
  }
  DEBUG && console.log("tracking ->", signal, rootNode);
  let roots = dependencyMap.get(signal) || new Set();
  roots.add(rootNode);
  dependencyMap.set(signal, roots);
}

let updateCounter = 0;
let nextTick = 0;

function tick() {
  if (running) {
    cancelAnimationFrame(nextTick);
    nextTick = requestAnimationFrame(update);
  }
}

// check for dirty signals and re-render components
function update() {
  if (dirty.size >= 1) {
    for (let [signal, prev] of dirty) {
      let deps = dependencyMap.get(signal);

      // Delete the signal from the dependency map before proceeding with rendering.
      // A new dependency set will be created if the signal is still being used.
      dependencyMap.delete(signal);

      if (deps?.size >= 1) {
        for (let d of deps) {
          repaint(d);
        }
      }
    }

    dirty.clear();
    updateCounter = 0;
  }
}

// re-renders a component, all necessary info is attached to the DOM node itself
function repaint(c) {
  if (++updateCounter > 1000) {
    throw new Error("Infinite loop detected");
  }

  // if this is a plain HTML element, walk up the tree to the nearest component
  while (!c._templateId || !c.parentNode) {
    c = c.parentNode;
  }

  let id = c._templateId;
  let props = c._props;
  let target = c.parentNode;

  DEBUG && log("[repaint]", id, props);
  render(id, target, props);
}

// helper for `html` tagged template literal,
// only used for syntax highlighting at this point
export function html(s) {
  return s.join("\n");
}
