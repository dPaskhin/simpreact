import { domAdapter } from '@simpreact/dom';
import { createRenderRuntime } from '@simpreact/internal';
import { emptyObject } from '@simpreact/shared';

export const renderRuntime = createRenderRuntime(domAdapter, function renderer(component, element) {
  const props = element.props || emptyObject;
  const proto = component.prototype;
  if (proto?.isReactComponent || proto?.render) {
    const inst = new component(props);
    return inst.render();
  }
  return component(props);
});

export default {
  renderRuntime,
};
