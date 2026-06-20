export type { FC, Key, SimpElement, SimpNode } from './createElement.js';
export {
  createElement,
  SIMP_ELEMENT_CHILD_FLAG_ELEMENT,
  SIMP_ELEMENT_CHILD_FLAG_LIST,
  SIMP_ELEMENT_FLAG_FC,
  SIMP_ELEMENT_FLAG_FRAGMENT,
  SIMP_ELEMENT_FLAG_HOST,
  SIMP_ELEMENT_FLAG_PORTAL,
  SIMP_ELEMENT_FLAG_TEXT,
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
