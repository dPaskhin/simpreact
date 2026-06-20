import { SIMP_ELEMENT_CHILD_FLAG_ELEMENT, SIMP_ELEMENT_CHILD_FLAG_LIST, type SimpElement } from './createElement.js';
import { acquireUnmountChildrenFrame, type UnmountChildrenFrame } from './processStack.js';
import type { SimpRenderRuntime } from './runtime.js';
import { _pushUnmountEnterFrame } from './unmounting.js';

export function _pushUnmountChildrenFrame(parent: SimpElement, renderRuntime: SimpRenderRuntime): void {
  renderRuntime.renderStack.push(acquireUnmountChildrenFrame(renderRuntime, parent));
}

export function _unmountChildren(frame: UnmountChildrenFrame): void {
  switch (frame.node.childFlag) {
    case SIMP_ELEMENT_CHILD_FLAG_LIST: {
      const children = frame.node.children as SimpElement[];

      for (let i = children.length - 1; i >= 0; i -= 1) {
        _pushUnmountEnterFrame(children[i]!, frame.meta.renderRuntime);
      }

      break;
    }
    case SIMP_ELEMENT_CHILD_FLAG_ELEMENT:
      _pushUnmountEnterFrame(frame.node.children as SimpElement, frame.meta.renderRuntime);
      break;
  }
}
