import type { FC, SimpElement, SimpNode } from './createElement.js';
import type { HostAdapter } from './hostAdapter.js';
import type { RenderMeta } from './processStack.js';
import type { TraversalStack } from './traverseStack.js';

export interface SimpRuntimeFCRenderer {
  (component: FC, element: SimpElement): SimpNode;
}

export interface SimpRenderRuntime {
  hostAdapter: HostAdapter;
  renderer: SimpRuntimeFCRenderer;
  renderStack: TraversalStack<SimpElement, RenderMeta>;
  [key: string]: unknown;
}
