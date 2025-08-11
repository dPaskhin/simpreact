import type { SimpText } from './public.js';

export function isSimpText(value: unknown): value is SimpText {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint';
}

export function noop(): void {}
