import type { Dict, Maybe, Nullable } from '../shared';
import type { SimpElement } from './createElement';

export type HostReference = never;

export interface HostAdapter<HostRef = any, HostTextRef = any> {
  createReference(type: string): HostRef;

  createTextReference(text: string): HostTextRef;

  mountProps(reference: HostRef, props: Dict): void;

  patchProp(reference: HostRef, propName: string, prevValue: unknown, nextValue: unknown): void;

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
