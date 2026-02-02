import * as SimpReactDOM from '@simpreact/dom';
import * as SimpReactShared from '@simpreact/shared';
import { renderRuntime } from './renderRuntime.js';

export const hydrate = SimpReactShared.noop;
export const render = SimpReactDOM.createRenderer(renderRuntime);
export const createRoot = SimpReactDOM.createCreateRoot(renderRuntime);

export default {
  hydrate,
  render,
  createRoot,
};
