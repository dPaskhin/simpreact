import { domAdapter } from '@simpreact/dom';
import type { SimpRenderRuntime } from '@simpreact/internal';
import { emptyObject } from '@simpreact/shared';

export const renderRuntime: SimpRenderRuntime = {
  hostAdapter: domAdapter,
  renderer(component, element) {
    const props = element.props || emptyObject;
    const proto = (component as any).prototype;
    if (proto?.isReactComponent || proto?.render) {
      const inst = new (component as any)(props);
      return inst.render();
    }
    return component(props);
  },
  elementToHostMap: new Map(),
  renderStack: [],
  currentRenderingFCElement: null,
  renderPhase: null,
};

export default {
  renderRuntime,
};

// TODO
(window as any).__SIMP_RUNTIME__ = renderRuntime;
