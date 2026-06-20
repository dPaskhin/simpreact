import type { FC, SimpElement, SimpNode } from './createElement.js';
import type { HostAdapter } from './hostAdapter.js';
import type { SimpRenderStack } from './processStack.js';

export interface SimpRuntimeFCRenderer {
  (component: FC, element: SimpElement, renderRuntime: SimpRenderRuntime): SimpNode;
}

export interface SimpRenderRuntime {
  hostAdapter: HostAdapter;
  renderer: SimpRuntimeFCRenderer;
  renderStack: SimpRenderStack;
}

export function createRenderRuntime(hostAdapter: HostAdapter, renderer: SimpRuntimeFCRenderer): SimpRenderRuntime {
  return { hostAdapter, renderer, renderStack: [] };
}
