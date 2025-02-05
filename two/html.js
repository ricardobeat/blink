export function html(parts, ...values) {
  let out = [];
  for (let i in parts) {
    out.push(parts[i]);
    let value = values[i];
    if (value != null) {
      out.push(value);
    }
  }
  out._template = true;
  return out;
}

export function each(list, each) {
  let arr = list.map(each);
  arr._template = true;
  return arr;
}
