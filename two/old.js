import * as Beep from "./beep.js";

let registryKeys = new WeakMap();
let registry = {};

function alive(mod) {
  const stateObj = {};
  const stateVars = Object.keys(mod);
  for (let k of stateVars) {
    stateObj[k] = new Proxy(
      { value: mod[k] },
      {
        get(target, prop, receiver) {
          const prim = Reflect.get(target, "value");
          const value = prim[prop];
          return typeof value === "function" ? value.bind(prim) : value;
        },
        set(target, prop, value) {
          Reflect.set(target.value, prop, value);
          console.log("set", target.value, prop, value);
          // render();
          return true;
        },
      },
    );
  }
  // const proxyObj = new Proxy(mod, {
  //   get(target, prop) {
  //     console.log(`GET ${prop}`);
  //     return this[prop] || target[prop];
  //   },
  //   set(target, prop, value) {
  //     console.log(`SET ${prop} = ${value}`);
  //     this[prop] = value;
  //     render();
  //     return true;
  //   },
  // });

  // if (mod.bind) addListeners(mod);

  let key = Math.random().toString(36).slice(2, 8);
  registryKeys.set(mod, key);
  registry[key] = mod;

  return stateObj;
}

function addListeners(mod) {
  if (mod.bind) {
    for (let k in mod.bind) {
      const el = document.getElementById(k);
      const events = mod.bind[k];
      for (let event in events) {
        document.documentElement.addEventListener(
          event,
          (e) => {
            if (e.target.id === k) {
              events[event]();
              // render();
            }
          },
          false,
        );
      }
    }
  }
}

window.dispatchComponentEvent = function (key, handlerName) {
  registry[key][handlerName]();
  // render();
};

function render() {
  let src = Beep.Beep();
  let key = registryKeys.get(Beep);
  src = src.replace(/on:click="(\w+)"/g, (m, fn) => {
    return `onClick="dispatchComponentEvent('${key}', '${fn}')"`;
  });
  document.body.innerHTML = src;
}

const obj = alive(Beep);

console.log(obj);

obj.$count = 4;

// obj.$state.count += 7;

render();
