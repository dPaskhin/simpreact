import type { FC, SimpElement, SimpNode } from './createElement.js';
import type { HostAdapter } from './hostAdapter.js';
import type { FramePool, SimpRenderStack } from './processStack.js';

export interface SimpRuntimeFCRenderer {
  (component: FC, element: SimpElement, renderRuntime: SimpRenderRuntime): SimpNode;
}

export interface SimpRenderRuntime {
  hostAdapter: HostAdapter;
  renderer: SimpRuntimeFCRenderer;
  renderStack: SimpRenderStack;
  framePool: FramePool;
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
    framePool: { mount: [], mountChildren: [], patch: [], unmount: [], unmountChildren: [], place: [], replace: [] },
    activeRenderElement: null,
    pendingRerenderFlag: false,
  };
}
