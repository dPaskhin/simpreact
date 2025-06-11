import type { SimpElement } from './createElement';

interface RefSimpElement extends SimpElement {
  ref?: {
    value: NonNullable<Ref<unknown>>;
    cleanup?: VoidFunction;
  };
}

export interface RefObject<T> {
  current: T;
}

export type RefCallback<T> = {
  bivarianceHack(instance: T | null): VoidFunction | void;
}['bivarianceHack'];

export type Ref<T> = RefCallback<T> | RefObject<T> | null;

export function unmountRef(element: RefSimpElement): void {
  if (element.ref == null) {
    return;
  }

  if (typeof element.ref.cleanup === 'function') {
    element.ref.cleanup();
  }

  if (typeof element.ref.value !== 'function') {
    element.ref.value.current = null;
  }
}

export function applyRef(element: RefSimpElement): void {
  if (element.ref == null) {
    return;
  }

  if (typeof element.ref.cleanup === 'function') {
    element.ref.cleanup();
  }

  if (typeof element.ref.value === 'function') {
    let cleanup;
    if ((cleanup = element.ref.value(element.reference))) {
      element.ref.cleanup = cleanup;
    }
    return;
  }

  element.ref.value.current = element.reference;
}
