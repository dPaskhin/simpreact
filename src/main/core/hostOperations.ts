import type { SimpElement } from './createElement.js';
import {
  HOST_OPS_PLACE_ELEMENT_BEFORE_ANCHOR,
  HOST_OPS_REPLACE_CHILD,
  type PlaceElementFrameMeta,
  type ReplaceElementFrameMeta,
} from './processStack.js';
import type { SimpRenderRuntime } from './runtime.js';

export function _pushHostOperationPlaceElement(element: SimpElement, meta: PlaceElementFrameMeta): void {
  meta.renderRuntime.renderStack.push({
    node: element,
    kind: HOST_OPS_PLACE_ELEMENT_BEFORE_ANCHOR,
    meta,
  });
}

export function _pushHostOperationReplaceElement(
  element: SimpElement,
  renderRuntime: SimpRenderRuntime,
  meta: ReplaceElementFrameMeta
): void {
  renderRuntime.renderStack.push({
    node: element,
    kind: HOST_OPS_REPLACE_CHILD,
    meta,
  });
}
