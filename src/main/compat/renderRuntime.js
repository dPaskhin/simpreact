import { domAdapter } from '@simpreact/dom';
import { emptyObject } from '@simpreact/shared';

export const renderRuntime = {
  hostAdapter: domAdapter,
  renderer(component, element) {
    const props = element.props || emptyObject;
    const proto = component.prototype;
    if (proto?.isReactComponent || proto?.render) {
      const inst = new component(props);
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
