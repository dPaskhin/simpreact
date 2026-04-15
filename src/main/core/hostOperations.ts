import type { SimpElement } from './createElement.js';
import { HOST_OPS_PLACE_ELEMENT_BEFORE_ANCHOR, HOST_OPS_REPLACE_CHILD, type RenderFrameMeta } from './processStack.js';

export function _pushHostOperationPlaceElement(element: SimpElement, meta: RenderFrameMeta): void {
  meta.renderRuntime.renderStack.push({
    node: element,
    phase: HOST_OPS_PLACE_ELEMENT_BEFORE_ANCHOR,
    meta,
  });
}

export function _pushHostOperationReplaceElement(element: SimpElement, meta: RenderFrameMeta): void {
  meta.renderRuntime.renderStack.push({
    node: element,
    phase: HOST_OPS_REPLACE_CHILD,
    meta,
  });
}
