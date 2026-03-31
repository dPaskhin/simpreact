import { domAdapter } from '@simpreact/dom';
import type { SimpRenderRuntime } from '@simpreact/internal';
import { TraversalStack } from '@simpreact/internal';
import { emptyObject } from '@simpreact/shared';

export const renderRuntime: SimpRenderRuntime = {
  hostAdapter: domAdapter,
  renderer(component, element) {
    return component(element.props || emptyObject);
  },
  renderStack: new TraversalStack(),
};
