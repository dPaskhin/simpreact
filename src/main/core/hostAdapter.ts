import type { Dict, Maybe, Nullable } from '@simpreact/shared';

import type { SimpElement } from './createElement';

export type HostReference = any;

export interface HostAdapter<HostRef = any, HostTextRef = any> {
  createReference(type: string): HostRef;

  createTextReference(text: string): HostTextRef;

  mountProps(reference: HostRef, props: Dict, prevElement: Maybe<SimpElement>, nextElement: Maybe<SimpElement>): void;

  patchProp(
    reference: HostRef,
    prevElement: Maybe<SimpElement>,
    nextElement: Maybe<SimpElement>,
    propName: string,
    prevValue: unknown,
    nextValue: unknown
  ): void;

  setClassname(reference: HostRef, className: Maybe<string>): void;

  setTextContent(reference: HostRef, text: string): void;

  appendChild(parent: HostRef, child: HostRef | HostTextRef): void;

  removeChild(parent: HostRef, child: HostRef | HostTextRef): void;

  replaceChild(parent: HostRef, replacer: HostRef | HostTextRef, toBeReplaced: HostRef | HostTextRef): void;

  insertBefore(parent: HostRef, child: HostRef | HostTextRef, before: Nullable<HostRef | HostTextRef>): void;

  insertOrAppend(parent: HostRef, child: HostRef | HostTextRef, before: Nullable<HostRef | HostTextRef>): void;

  findParentReference(reference: HostRef | HostTextRef): Nullable<HostRef>;

  clearNode(reference: HostRef | HostTextRef): void;

  attachElementToReference(element: SimpElement, reference: HostRef | HostTextRef): void;
}

export let hostAdapter: HostAdapter;

export function provideHostAdapter(adapter: HostAdapter): void {
  hostAdapter = adapter;
}
