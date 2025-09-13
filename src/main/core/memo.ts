import { shallowEqual } from '@simpreact/shared';

import type { FC, SimpNode } from './createElement.js';

export interface MemoizedComponent {
  (props: any): SimpNode;

  _isMemo: true;
  _render: FC;
  _compare: (prevProps: any, nextProps: any) => boolean;
}

export function memo(Component: FC, compare = shallowEqual): MemoizedComponent {
  const Memoized = (props => Component(props)) as MemoizedComponent;

  Memoized._isMemo = true;
  Memoized._render = Component;
  Memoized._compare = compare;

  return Memoized;
}

export function isMemo(type: any): type is MemoizedComponent {
  return type._isMemo;
}
