import { createCreateRoot, createRenderer } from '@simpreact/dom';
import { noop } from '@simpreact/shared';
import { renderRuntime } from './renderRuntime.js';

export const hydrate = noop;
export const render = createRenderer(renderRuntime);
export const createRoot = createCreateRoot(renderRuntime);

export default {
  hydrate,
  render,
  createRoot,
};
