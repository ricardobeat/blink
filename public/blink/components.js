// store references to all known components and their default props
export const registry = {};
export const registryDefaultProps = {};

export class ComponentDefinition {
  constructor(id, html, props) {
    this.id = id.toLowerCase();
    this.template = makeTemplate(this.id, html);
    this.props = props;
  }
}

export function getComponents() {
  let templates = [].slice.call(document.querySelectorAll("template"), 0);
  templates.forEach((c) => {
    registry[c.id.toLowerCase()] = c;
  }, {});
  return registry;
}

// createComponent('todo-item', html`<p>{{this}}</p>`)
export function createComponent(id, html, props) {
  let def = new ComponentDefinition(id, html, props);
  registry[id] = def.template;
  if (props) {
    registryDefaultProps[id] = props;
  }
  return def;
}

function makeTemplate(id, html) {
  if (typeof html === "string") {
    let tmpl = document.createElement("template");
    tmpl.id = id;
    tmpl.innerHTML = html;
    return tmpl;
  }
  return html;
}
