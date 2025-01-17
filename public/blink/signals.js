export class Signal {
  constructor(value) {
    this.value = value;
  }
}

export function value(_value) {
  return new Signal(_value);
}
