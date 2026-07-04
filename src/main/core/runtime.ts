import type { FC, SimpElement, SimpNode } from './createElement.js';
import type { HostAdapter } from './hostAdapter.js';
import type { SimpRenderStack } from './processStack.js';

export interface SimpRuntimeFCRenderer {
  (component: FC, element: SimpElement, renderRuntime: SimpRenderRuntime): SimpNode;
}

export interface SimpRenderRuntime {
  hostAdapter: HostAdapter;
  renderer: SimpRuntimeFCRenderer;
  /** Doubles as the frame pool: slots above stackCursor hold frames freed by a previous pop, ready for reuse. */
  renderStack: SimpRenderStack;
  /** Index of the top active frame in renderStack; -1 when empty. */
  stackCursor: number;
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
    stackCursor: -1,
    activeRenderElement: null,
    pendingRerenderFlag: false,
  };
}
