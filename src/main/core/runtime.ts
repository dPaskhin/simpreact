import type { Nullable } from '@simpreact/shared';
import type { FC, SimpElement, SimpNode } from './createElement.js';
import type { HostAdapter } from './hostAdapter.js';
import type { SimpRenderStack } from './processStack.js';

export interface SimpRuntimeFCRenderer {
  (component: FC, element: SimpElement, renderRuntime: SimpRenderRuntime): SimpNode;
}

export const MOUNTING_PHASE = 0;
export const UPDATING_PHASE = 1;

export interface SimpRenderRuntime {
  hostAdapter: HostAdapter;
  renderer: SimpRuntimeFCRenderer;
  renderStack: SimpRenderStack;
  elementToHostMap: Map<unknown, SimpElement>;
  currentRenderingFCElement: Nullable<SimpElement>;
  renderPhase: Nullable<typeof MOUNTING_PHASE | typeof UPDATING_PHASE>;
}
