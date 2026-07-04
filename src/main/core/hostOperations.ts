import type { Nullable } from '@simpreact/shared';
import type { SimpElement } from './createElement.js';
import { acquireFrame, HOST_OPS_PLACE_ELEMENT_BEFORE_ANCHOR, HOST_OPS_REPLACE_CHILD } from './processStack.js';
import type { SimpRenderRuntime } from './runtime.js';

export function pushHostOperationPlaceElement(
  element: SimpElement,
  renderRuntime: SimpRenderRuntime,
  parentReference: unknown,
  subtreeRightBoundary: Nullable<SimpElement>
): void {
  const frame = acquireFrame(renderRuntime);
  frame.kind = HOST_OPS_PLACE_ELEMENT_BEFORE_ANCHOR;
  frame.node = element;
  frame.renderRuntime = renderRuntime;
  frame.parentReference = parentReference;
  frame.subtreeRightBoundary = subtreeRightBoundary;
  frame.context = null;
  frame.hostNamespace = null;
  frame.prevElement = null!;
  frame.children = null;
  frame.placeHolderElement = null;
}

export function pushHostOperationReplaceElement(
  element: SimpElement,
  renderRuntime: SimpRenderRuntime,
  parentReference: unknown,
  prevElement: SimpElement
): void {
  const frame = acquireFrame(renderRuntime);
  frame.kind = HOST_OPS_REPLACE_CHILD;
  frame.node = element;
  frame.renderRuntime = renderRuntime;
  frame.parentReference = parentReference;
  frame.prevElement = prevElement;
  frame.subtreeRightBoundary = null;
  frame.context = null;
  frame.hostNamespace = null;
  frame.children = null;
  frame.placeHolderElement = null;
}
