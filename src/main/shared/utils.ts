import type { Primitive } from './public';

export function isPrimitive(value: unknown): value is Primitive {
  return (
    value == null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'bigint' ||
    typeof value === 'boolean'
  );
}
