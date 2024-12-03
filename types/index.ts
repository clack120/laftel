export type int = number & { __int__: void };
export type float = number & { __float__: void };
export function isInt(n: number): n is int {
  return Number.isInteger(n);
}
export function isFloat(n: number): n is float {
  return n !== Math.floor(n);
}
export * from "./types";
