export function _html(parts, ...values) {
  let out = "";
  for (let i in parts) {
    out += parts[i];
    let value = values[i];
    if (value != null) {
      if (Array.isArray(value)) {
        if (typeof value[0] === "function") {
          console.log(value, value[0].name);
        }
        out += value.join("\n");
      } else {
        out += value;
      }
    }
  }
  return out;
}
