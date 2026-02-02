import type { FC, SimpElement, SimpNode } from './createElement.js';
import type { HostAdapter } from './hostAdapter.js';

export interface SimpRuntimeFCRenderer {
  (component: FC, element: SimpElement): SimpNode;
}

export interface SimpRenderRuntime {
  hostAdapter: HostAdapter;
  renderer: SimpRuntimeFCRenderer;
  [key: string]: unknown;
}
