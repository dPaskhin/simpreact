import { SIMP_ELEMENT_CHILD_FLAG_ELEMENT, SIMP_ELEMENT_CHILD_FLAG_LIST, type SimpElement } from './createElement.js';
import { acquireUnmountChildrenFrame, type SimpRenderFrame } from './processStack.js';
import type { SimpRenderRuntime } from './runtime.js';
import { pushUnmountEnterFrame } from './unmounting.js';

export function pushUnmountChildrenFrame(parent: SimpElement, renderRuntime: SimpRenderRuntime): void {
  renderRuntime.renderStack.push(acquireUnmountChildrenFrame(renderRuntime, parent));
}

export function unmountChildren(frame: SimpRenderFrame): void {
  switch (frame.node.childFlag) {
    case SIMP_ELEMENT_CHILD_FLAG_LIST: {
      const children = frame.node.children as SimpElement[];

      for (let i = children.length - 1; i >= 0; i -= 1) {
        pushUnmountEnterFrame(children[i]!, frame.renderRuntime);
      }

      break;
    }
    case SIMP_ELEMENT_CHILD_FLAG_ELEMENT:
      pushUnmountEnterFrame(frame.node.children as SimpElement, frame.renderRuntime);
      break;
  }
}
