import * as SimpReactDOM from '@simpreact/dom';
import * as SimpReactShared from '@simpreact/shared';

export const hydrate = SimpReactShared.noop;
export const render = SimpReactDOM.render;
export const createRoot = SimpReactDOM.createRoot;

export default {
  hydrate,
  render,
  createRoot,
};
