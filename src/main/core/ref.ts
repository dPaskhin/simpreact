import type { Nullable } from '@simpreact/shared';
import type { SimpElement } from './createElement.js';

interface RefSimpElement extends SimpElement {
  ref: Nullable<{
    value: NonNullable<Ref<unknown>>;
    cleanup: Nullable<() => void>;
  }>;
}

export type RefObject<T> = { current: T };
export type RefCallback<T> = {
  bivarianceHack(instance: T): (() => void | undefined) | void;
}['bivarianceHack'];
export type Ref<T> = RefCallback<T> | RefObject<T | null> | null;

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
