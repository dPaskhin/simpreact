import type { Nullable } from '@simpreact/shared';
import type { SimpElement } from './createElement.js';
import { acquirePlaceFrame, acquireReplaceFrame } from './processStack.js';
import type { SimpRenderRuntime } from './runtime.js';

/** @internal */
export function pushHostOperationPlaceElement(
  element: SimpElement,
  renderRuntime: SimpRenderRuntime,
  parentReference: unknown,
  subtreeRightBoundary: Nullable<SimpElement>
): void {
  renderRuntime.renderStack.push(acquirePlaceFrame(renderRuntime, element, parentReference, subtreeRightBoundary));
}

/** @internal */
export function pushHostOperationReplaceElement(
  element: SimpElement,
  renderRuntime: SimpRenderRuntime,
  parentReference: unknown,
  prevElement: SimpElement
): void {
  renderRuntime.renderStack.push(acquireReplaceFrame(renderRuntime, element, parentReference, prevElement));
}
