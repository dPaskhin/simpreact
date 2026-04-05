import type { RenderFrame } from './processStack.js';

export function _pushHostOperation(frame: RenderFrame): void {
  frame.meta.renderRuntime.renderStack.push(frame);
}
