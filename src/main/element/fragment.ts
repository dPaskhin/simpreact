import type { Maybe } from '../types';
import type { SimpElement, SimpNode } from './types';
import { createElement } from './createElement';

export function Fragment(props: { children?: Maybe<SimpNode> }) {
  return props.children;
}

export function createFragmentElement(children: SimpNode) {
  return createElement(Fragment, { children });
}

export function isFragmentElement(element: Maybe<SimpElement>): boolean {
  return element?.type === Fragment;
}
