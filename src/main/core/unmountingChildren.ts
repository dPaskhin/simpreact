import { SIMP_ELEMENT_CHILD_FLAG_ELEMENT, SIMP_ELEMENT_CHILD_FLAG_LIST, type SimpElement } from './createElement.js';
import { acquireFrame, type SimpRenderFrame, UNMOUNT_CHILDREN_ENTER } from './processStack.js';
import type { SimpRenderRuntime } from './runtime.js';
import { pushUnmountEnterFrame } from './unmounting.js';

export function pushUnmountChildrenFrame(parent: SimpElement, renderRuntime: SimpRenderRuntime): void {
  const frame = acquireFrame(renderRuntime);
  frame.kind = UNMOUNT_CHILDREN_ENTER;
  frame.node = parent;
  frame.renderRuntime = renderRuntime;
  frame.parentReference = null;
  frame.subtreeRightBoundary = null;
  frame.context = null;
  frame.hostNamespace = null;
  frame.prevElement = null!;
  frame.children = null;
  frame.placeHolderElement = null;
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
