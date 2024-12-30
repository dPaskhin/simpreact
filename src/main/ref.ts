import type { Maybe } from './types';
import type { SimpElement } from './element';

export function cleanupRef(element: Maybe<SimpElement>): void {
  if (
    typeof element?._store === 'object' &&
    element._store != null &&
    'refCleanup' in element._store &&
    typeof element._store.refCleanup === 'function'
  ) {
    element._store.refCleanup();
  }
}

export function applyRef(element: Maybe<SimpElement>): void {
  if (element == null) {
    return;
  }

  cleanupRef(element);

  if (typeof element.props?.ref !== 'function') {
    element.props.ref.current = element._reference;
    return;
  }

  const cleanup = element.props.ref(element._reference) || undefined;

  if (typeof cleanup === 'function') {
    Object.defineProperty((element._store ||= {}), 'refCleanup', {
      value: cleanup,
      configurable: true,
    });
  }
}
