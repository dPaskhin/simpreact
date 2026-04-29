import { domAdapter } from '@simpreact/dom';
import type { SimpRenderRuntime } from '@simpreact/internal';
import { emptyObject } from '@simpreact/shared';

export const renderRuntime: SimpRenderRuntime = {
  hostAdapter: domAdapter,
  renderer(component, element) {
    return component(element.props || emptyObject);
  },
  elementToHostMap: new Map(),
  renderStack: [],
};

// TODO
(window as any).__SIMP_RUNTIME__ = renderRuntime;
