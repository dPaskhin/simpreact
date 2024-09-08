import type { Many, Maybe } from '../types';
import { SIMP_ELEMENT_TYPE } from './createElement';

export interface FunctionComponent<P = {}> {
  (props: P): SimpNode;
}

export interface FC<P = {}> extends FunctionComponent<P> {}

export interface SimpElement<P = any> {
  readonly $$typeof: typeof SIMP_ELEMENT_TYPE;

  readonly type: FunctionComponent<P> | string;

  readonly props: Maybe<P>;

  _children: Maybe<Many<SimpElement>>;

  _parent: Maybe<SimpElement>;

  _index: number;

  _reference: unknown;

  _store: unknown;
}

export type SimpNode = SimpElement | string | number | Array<SimpNode> | boolean | null | undefined;
