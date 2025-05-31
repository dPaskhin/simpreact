import type { Dict, Maybe, Nullable } from '../shared';

export type HostReference = never;

// TODO: do any type as a default?
export interface HostAdapter<HostRef = never, HostTextRef = never> {
  createReference(type: string): HostRef;

  createTextReference(text: string): HostTextRef;

  mountProps(reference: HostRef, props: Dict): void;

  patchProp(reference: HostRef, propName: string, prevValue: unknown, nextValue: unknown): void;

  setClassname(reference: HostRef, className: Maybe<string>): void;

  setTextContent(reference: HostRef, text: string): void;

  appendChild(parent: HostRef, child: HostRef | HostTextRef): void;

  removeChild(parent: HostRef, child: HostRef | HostTextRef): void;

  replaceChild(parent: HostRef, replacer: HostRef | HostTextRef, child: HostRef | HostTextRef): void;

  insertBefore(parent: HostRef, child: HostRef | HostTextRef, before: Nullable<HostRef | HostTextRef>): void;

  insertOrAppend(parent: HostRef, child: HostRef | HostTextRef, before: Nullable<HostRef | HostTextRef>): void;

  findParentReference(reference: HostRef | HostTextRef): Nullable<HostRef>;
}
