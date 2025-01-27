import type { FunctionComponent, SimpElement, SimpNode } from './types';
import type { Maybe } from '../types';

export const SIMP_ELEMENT_TYPE = Symbol('SIMP_ELEMENT_TYPE');

export function createElement<P extends {} = {}>(
  type: string,
  props?: Maybe<P>,
  ...children: SimpNode[]
): SimpElement<P | null>;

export function createElement<P extends {} = {}>(
  type: FunctionComponent<P>,
  props?: Maybe<P>,
  ...children: SimpNode[]
): SimpElement<P>;

export function createElement(type: string | FunctionComponent, props: unknown, ...children: SimpNode[]) {
  if (children.length > 0) {
    props = Object.assign({}, props, children.length === 1 ? { children: children[0] } : { children });
  }

  return {
    $$typeof: SIMP_ELEMENT_TYPE,
    type,
    props: props ?? (typeof type === 'function' ? {} : null),
    _children: null,
    _parent: null,
    _index: -1,
    _reference: null,
    _store: null,
    _globalContext: null,
  } as const;
}
