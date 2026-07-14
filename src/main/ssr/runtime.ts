import { createRenderRuntime, type HostAdapter, type SimpRenderRuntime } from '@simpreact/internal';
import { emptyObject } from '@simpreact/shared';

// Never legitimately called — the walker never mounts/patches. A call here means an async
// rerender()/setState reached the host adapter after renderToString() already returned.
function unreachable(): never {
  throw new Error(
    'simpreact SSR: a host operation was attempted after renderToString() completed. ' +
      'This usually means rerender()/a state setter was called asynchronously (e.g. from a .then() ' +
      'or a timer) during server rendering, which is not supported.'
  );
}

const ssrHostAdapter: HostAdapter = {
  createReference: unreachable,
  createTextReference: unreachable,
  mountProps: unreachable,
  patchProps: unreachable,
  unmountProps: unreachable,
  setClassname: unreachable,
  setTextContent: unreachable,
  removeChild: unreachable,
  replaceChild: unreachable,
  insertOrAppend: unreachable,
  clearNode: unreachable,
  // No-op: there's no real host to look elements up on.
  attachElementToReference() {},
  detachElementFromReference() {},
  getElementFromReference() {
    return null;
  },
  getHostNamespaces() {
    return null;
  },
};

export function createSsrRenderRuntime(): SimpRenderRuntime {
  return createRenderRuntime(ssrHostAdapter, (component, element) => component(element.props || emptyObject));
}
