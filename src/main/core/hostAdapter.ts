import type { Maybe, Nullable } from '@simpreact/shared';

import type { SimpElement } from './createElement';

export type HostReference = any;

export interface HostAdapter<HostRef = any, HostTextRef = any, NS = string> {
  createReference(type: string, namespace?: Maybe<NS>): HostRef;

  createTextReference(text: string): HostTextRef;

  mountProps(reference: HostRef, element: SimpElement, namespace?: Maybe<NS>): void;

  patchProps(reference: HostRef, prevElement: SimpElement, nextElement: SimpElement, namespace?: Maybe<NS>): void;

  setClassname(reference: HostRef, className: Maybe<string>, namespace?: Maybe<NS>): void;

  setTextContent(reference: HostRef, text: string): void;

  appendChild(parent: HostRef, child: HostRef | HostTextRef): void;

  removeChild(parent: HostRef, child: HostRef | HostTextRef): void;

  replaceChild(parent: HostRef, replacer: HostRef | HostTextRef, toBeReplaced: HostRef | HostTextRef): void;

  insertBefore(parent: HostRef, child: HostRef | HostTextRef, before: Nullable<HostRef | HostTextRef>): void;

  insertOrAppend(parent: HostRef, child: HostRef | HostTextRef, before: Nullable<HostRef | HostTextRef>): void;

  findParentReference(reference: HostRef | HostTextRef): Nullable<HostRef>;

  findNextSiblingReference(reference: HostRef | HostTextRef): Nullable<HostRef>;

  clearNode(reference: HostRef | HostTextRef): void;

  attachElementToReference(element: SimpElement, reference: HostRef | HostTextRef): void;

  getHostNamespaces(
    element: SimpElement,
    currentNamespace: Maybe<NS>
  ): Nullable<{
    self: Nullable<NS>;
    children: Nullable<NS>;
  }>;
}

export let hostAdapter: HostAdapter;

export function provideHostAdapter(adapter: HostAdapter): void {
  hostAdapter = adapter;
}
