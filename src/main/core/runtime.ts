import type { FC, SimpElement, SimpNode } from './createElement.js';
import type { HostAdapter } from './hostAdapter.js';
import type { SimpRenderFrame, SimpRenderStack } from './processStack.js';

export interface SimpRuntimeFCRenderer {
  (component: FC, element: SimpElement, renderRuntime: SimpRenderRuntime): SimpNode;
}

export interface SimpRenderRuntime {
  hostAdapter: HostAdapter;
  renderer: SimpRuntimeFCRenderer;
  renderStack: SimpRenderStack;
  framePool: SimpRenderFrame[];
  /** The FC element currently executing its render function, or null when idle. */
  activeRenderElement: SimpElement | null;
  /** Set by rerender() when called against activeRenderElement to signal a loop retry. */
  pendingRerenderFlag: boolean;
}

export function createRenderRuntime(hostAdapter: HostAdapter, renderer: SimpRuntimeFCRenderer): SimpRenderRuntime {
  return {
    hostAdapter,
    renderer,
    renderStack: [],
    framePool: [],
    activeRenderElement: null,
    pendingRerenderFlag: false,
  };
}
