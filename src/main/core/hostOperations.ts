import type { SimpElement } from './createElement.js';
import {
  HOST_OPS_PLACE_ELEMENT_BEFORE_ANCHOR,
  HOST_OPS_REPLACE_CHILD,
  type SimpRenderFrameMeta,
} from './processStack.js';

export function _pushHostOperationPlaceElement(element: SimpElement, meta: SimpRenderFrameMeta): void {
  meta.renderRuntime.renderStack.push({
    node: element,
    phase: HOST_OPS_PLACE_ELEMENT_BEFORE_ANCHOR,
    meta,
  });
}

export function _pushHostOperationReplaceElement(element: SimpElement, meta: SimpRenderFrameMeta): void {
  meta.renderRuntime.renderStack.push({
    node: element,
    phase: HOST_OPS_REPLACE_CHILD,
    meta,
  });
}
