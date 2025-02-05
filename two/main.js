const uid = () => ((Math.random() * 1e8) | 0).toString(16);

let registryKeys = new WeakMap();
let registry = {};
let registryTargets = new WeakMap();

// lol I can only have one instance of a component
export function alive(mod, targetElement) {
  let key = Math.random().toString(36).slice(2, 8);
  registryKeys.set(mod, key);
  registryTargets.set(mod, targetElement);
  registry[key] = mod;
  setdirty(1);
  start();
}

let dirty = new Map();
let raf = 0;
let running = false;

function start() {
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(refresh);
  running = true;
}

function stop() {
  running = false;
}

function setdirty(key) {
  dirty.set(key, true);
  start();
}

function refresh() {
  if (running && dirty.size > 0) {
    render();
    dirty.clear();
    raf = requestAnimationFrame(refresh);
  } else {
    stop();
  }
}

const classRegex = /class:(\w+)=/;

function render() {
  for (let [key, C] of Object.entries(registry)) {
    let key = registryKeys.get(C);
    let mod = registry[key];
    let renderTarget = registryTargets.get(C);
    let tmpl = C.default();
    let functions = {};
    let values = {};
    let root = renderTarget.cloneNode(false);
    let knownEvents = [];

    const renderTemplate = (tmpl) => {
      let output = "";
      for (let i = 0; i < tmpl.length; i++) {
        let s = tmpl[i];
        if (typeof s === "function") {
          let fid = s.name + "_" + uid();
          functions[fid] = s;
          output += fid;
        } else if (Array.isArray(s) && (s._template || s[0]?._template)) {
          output += renderTemplate(s);
        } else if (typeof s === "string") {
          if (s.endsWith("class=") && Array.isArray(tmpl[i + 1])) {
            let values = tmpl[i + 1];
            output += s;
            output += `"${values.filter(Boolean).join(" ")}"`;
            i++;
            continue;
          }
          if (
            s.endsWith("checked=") ||
            s.endsWith("disabled=") ||
            s.endsWith("readonly=")
          ) {
            let value = tmpl[i + 1];
            if (value) {
              output += s.slice(0, -1);
            } else {
              output += s.slice(0, s.lastIndexOf(" "));
            }
            i++;
            continue;
          }
          let matchClass = s.match(classRegex);
          if (matchClass) {
            let className = matchClass[1];
            let value = tmpl.splice(i + 1, 1);
            output += s.substring(0, matchClass.index);
            output += value ? `class="${className}"` : "";
          } else {
            output += s;
          }
        } else {
          let id = "value_" + uid();
          values[id] = s;
          output += id;
        }
      }

      output = output.replace(/on:(\w+)=/g, (m, eventName) => {
        knownEvents.push(eventName);
        return `data-on-${eventName}=`;
      });

      output = output.replace(/ref:(\w+)/g, (m, refName) => {
        return `data-ref="${refName}"`;
      });

      output = output.replace(/bind:(\w+)=(\w+)/g, (m, key, fn) => {
        return `data-bind="${key}:${fn}"`;
      });

      // fix self-closing elements
      output = output.replace(/<(\w+)([^>]*)\s+?\/>/g, "<$1$2></$1>");

      return output;
    };

    let output = renderTemplate(tmpl);

    let shadow = root.attachShadow({ mode: "open" });
    shadow.innerHTML = output;

    // render sub-components, this kinda sucks
    for (let k of Object.keys(mod).filter((k) => k[0].toUpperCase() === k[0])) {
      if (typeof mod[k] == "function") {
        shadow.querySelectorAll(k).forEach((el) => {
          let attrs = el.attributes;
          let props = {};
          for (let i = 0; i < attrs.length; i++) {
            let key = attrs[i].name;
            let valueId = attrs[i].value;
            props[key] = values[valueId];
          }
          let frag = document.createElement("div");
          frag.innerHTML = renderTemplate(mod[k](props));
          el.replaceWith(frag.firstElementChild);
        });
      }
    }
    console.log(values);

    let ctx = { refs: {} };

    for (let ref of shadow.querySelectorAll("[data-ref]")) {
      let refName = ref.getAttribute("data-ref");
      ctx.refs[refName] = ref;
    }

    for (let b of shadow.querySelectorAll("[data-bind]")) {
      let att = b.getAttribute("data-bind");
      let [key, fn] = att.split(":");
      shadow.addEventListener("input", (ev) =>
        functions[fn].call(ctx, ev.target[key]),
      );
    }

    if (mod.styles) {
      let css = typeof mod.styles === "function" ? mod.styles() : mod.styles;
      let stylesheet = new CSSStyleSheet();
      stylesheet.replaceSync(css);
      shadow.adoptedStyleSheets = [stylesheet];
    }

    for (let eventName of knownEvents) {
      let attr = `data-on-${eventName}`;
      shadow.addEventListener(eventName, function (ev) {
        if (ev.target.hasAttribute(attr)) {
          let id = ev.target.getAttribute(attr).trim();
          functions[id].apply(ctx, [ev, ctx]);
          if (!["input"].includes(eventName)) {
            setdirty(1);
          }
        }
      });
    }

    // inlineFunctions.delete(renderTarget);
    renderTarget.replaceWith(root);
    registryTargets.set(C, root);
  }
}
