import { createCreateRoot, createHydrateRoot, createRenderer } from '@simpreact/dom';
import { renderRuntime } from './renderRuntime.js';

export const render = createRenderer(renderRuntime);
export const createRoot = createCreateRoot(renderRuntime);
export const hydrateRoot = createHydrateRoot(renderRuntime);

export function hydrate(element, container) {
  if (!container) {
    return;
  }
  hydrateRoot(container).render(element);
}

export default {
  hydrate,
  hydrateRoot,
  render,
  createRoot,
};
