import type { SimpText } from './public.js';

export function isSimpText(value: unknown): value is SimpText {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint';
}

export function noop(): void {}

export function callOrGet<T, A extends any[]>(value: T | ((...args: A) => T), ...args: A): T;
export function callOrGet(value: unknown) {
  if (typeof value !== 'function') {
    return value;
  }

  if (arguments.length === 1) {
    return value();
  }

  if (arguments.length === 2) {
    return value(arguments[1]);
  }

  const args = [];

  for (let i = 1; i < arguments.length; ++i) {
    args.push(arguments[i]);
  }

  return value(...args);
}
