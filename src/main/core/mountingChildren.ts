import type { Many, Maybe, Nullable } from '@simpreact/shared';
import { SIMP_ELEMENT_CHILD_FLAG_ELEMENT, SIMP_ELEMENT_CHILD_FLAG_LIST, type SimpElement } from './createElement.js';
import { _pushMountEnterFrame } from './mounting.js';
import { acquireMountChildrenFrame, type MountChildrenFrame } from './processStack.js';
import type { SimpRenderRuntime } from './runtime.js';
import { isHostLike } from './utils.js';

export function _pushMountChildrenFrame(
  parent: SimpElement,
  renderRuntime: SimpRenderRuntime,
  children: Nullable<Many<SimpElement>>,
  parentReference: unknown,
  subtreeRightBoundary: Nullable<SimpElement>,
  context: unknown,
  hostNamespace: Maybe<string>
): void {
  renderRuntime.renderStack.push(
    acquireMountChildrenFrame(
      renderRuntime,
      parent,
      children,
      parentReference,
      subtreeRightBoundary,
      context,
      hostNamespace
    )
  );
}

export function _mountChildren(frame: MountChildrenFrame): void {
  const parentElement = frame.node;
  const { parentReference, hostNamespace, renderRuntime, context } = frame.meta;

  const subtreeRightBoundary = isHostLike(parentElement.flag) ? null : frame.meta.subtreeRightBoundary;

  switch (parentElement.childFlag) {
    case SIMP_ELEMENT_CHILD_FLAG_ELEMENT: {
      const children = frame.meta.children as SimpElement;
      children.parent = parentElement;

      _pushMountEnterFrame(
        children,
        renderRuntime,
        parentReference,
        subtreeRightBoundary,
        context,
        hostNamespace,
        null
      );

      break;
    }
    case SIMP_ELEMENT_CHILD_FLAG_LIST: {
      const children = frame.meta.children as SimpElement[];

      for (let i = children.length - 1; i >= 0; i--) {
        const child = children[i]!;
        child.parent = parentElement;

        const rightSibling = children[child.index + 1] || subtreeRightBoundary;

        _pushMountEnterFrame(child, renderRuntime, parentReference, rightSibling, context, hostNamespace, null);
      }
    }
  }
}
