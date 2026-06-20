export type { FC, Key, SimpElement, SimpNode } from './createElement.js';
export {
  createElement,
  hasElementChild,
  hasListChildren,
  isFC,
  isFragment,
  isHost,
  isPortal,
  isText,
} from './createElement.js';
export { Fragment } from './fragment.js';
export type { HostAdapter } from './hostAdapter.js';
export { registerLifecyclePlugin } from './lifecycleEventBus.js';
export { mount } from './mounting.js';
export { patch } from './patching.js';
export type { RefObject } from './ref.js';
export { rerender, withSyncRerender } from './rerender.js';
export type { SimpRenderRuntime } from './runtime.js';
export { MOUNTING_PHASE } from './runtime.js';
export { unmount } from './unmounting.js';
