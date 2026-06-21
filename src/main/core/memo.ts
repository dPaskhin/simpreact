import { shallowEqual } from '@simpreact/shared';

import type { FC, SimpNode } from './createElement.js';

const MEMO_BRAND = Symbol('memo');

export interface MemoizedComponent {
  (props: any): SimpNode;

  _compare: (prevProps: any, nextProps: any) => boolean;
}

export function memo(Component: FC, compare = shallowEqual): MemoizedComponent {
  const Memoized = (props => Component(props)) as MemoizedComponent;
  Memoized._compare = compare;
  (Memoized as any)[MEMO_BRAND] = true;
  Object.defineProperty(Memoized, 'name', { value: Component.name });
  return Memoized;
}

export function isMemo(type: any): type is MemoizedComponent {
  return type?.[MEMO_BRAND] === true;
}
