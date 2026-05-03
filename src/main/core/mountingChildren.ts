import { SIMP_ELEMENT_CHILD_FLAG_ELEMENT, SIMP_ELEMENT_CHILD_FLAG_LIST, type SimpElement } from './createElement.js';
import { _pushMountEnterFrame } from './mounting.js';
import { MOUNT_CHILDREN_ENTER, type MountChildrenFrame, type MountChildrenFrameMeta } from './processStack.js';
import { isHostLike } from './utils.js';

export function _pushMountChildrenFrame(parent: SimpElement, meta: MountChildrenFrameMeta): void {
  meta.renderRuntime.renderStack.push({
    node: parent,
    kind: MOUNT_CHILDREN_ENTER,
    meta,
  });
}

export function _mountChildren(frame: MountChildrenFrame): void {
  const parentElement = frame.node;
  const { parentReference, hostNamespace, renderRuntime, context } = frame.meta;

  const subtreeRightBoundary = isHostLike(parentElement.flag) ? null : frame.meta.subtreeRightBoundary;

  switch (parentElement.childFlag) {
    case SIMP_ELEMENT_CHILD_FLAG_ELEMENT: {
      const children = frame.meta.children as SimpElement;
      children.parent = parentElement;

      _pushMountEnterFrame(children, {
        renderRuntime,
        hostNamespace,
        subtreeRightBoundary,
        context,
        parentReference,
        placeHolderElement: null,
      });

      break;
    }
    case SIMP_ELEMENT_CHILD_FLAG_LIST: {
      const children = frame.meta.children as SimpElement[];

      for (let i = children.length - 1; i >= 0; i--) {
        const child = children[i]!;
        child.parent = parentElement;

        const rightSibling = children[child.index + 1] || subtreeRightBoundary;

        _pushMountEnterFrame(child, {
          renderRuntime,
          parentReference,
          context,
          hostNamespace,
          subtreeRightBoundary: rightSibling,
          placeHolderElement: null,
        });
      }
    }
  }
}
