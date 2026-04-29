import type { Maybe, Nullable } from '@simpreact/shared';

import type { SimpElement } from './createElement.js';
import type { SimpRenderRuntime } from './runtime.js';

export interface HostAdapter<HostRef = unknown, HostTextRef = unknown, NS = string> {
  createReference(type: string, namespace?: Maybe<NS>): HostRef;

  createTextReference(text: string): HostTextRef;

  mountProps(reference: HostRef, element: SimpElement, renderRuntime: SimpRenderRuntime, namespace?: Maybe<NS>): void;

  patchProps(
    reference: HostRef,
    prevElement: SimpElement,
    nextElement: SimpElement,
    renderRuntime: SimpRenderRuntime,
    namespace?: Maybe<NS>
  ): void;

  unmountProps(reference: HostRef, element: SimpElement, renderRuntime: SimpRenderRuntime): void;

  setClassname(reference: HostRef, className: Maybe<string>, namespace?: Maybe<NS>): void;

  setTextContent(reference: HostRef, text: string, referenceHasOnlyTextElement?: boolean): void;

  removeChild(parent: HostRef, child: HostRef | HostTextRef): void;

  replaceChild(parent: HostRef, replacer: HostRef | HostTextRef, toBeReplaced: HostRef | HostTextRef): void;

  insertOrAppend(parent: HostRef, child: HostRef | HostTextRef, before: Nullable<HostRef | HostTextRef>): void;

  clearNode(reference: HostRef | HostTextRef): void;

  attachElementToReference(
    element: SimpElement,
    reference: HostRef | HostTextRef,
    renderRuntime: SimpRenderRuntime
  ): void;

  detachElementFromReference(reference: HostRef | HostTextRef, renderRuntime: SimpRenderRuntime): void;

  getElementFromReference(reference: HostRef | HostTextRef, renderRuntime: SimpRenderRuntime): Nullable<SimpElement>;

  getHostNamespaces(
    element: SimpElement,
    currentNamespace: Maybe<NS>
  ): Nullable<{
    self: Nullable<NS>;
    children: Nullable<NS>;
  }>;
}
