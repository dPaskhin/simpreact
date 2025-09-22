import type { FC, Key, SimpElement } from '@simpreact/internal';
import { createElement, Fragment } from '@simpreact/internal';
import type { Maybe } from '@simpreact/shared';

export function jsx(type: string | FC, props?: any, key?: Maybe<Key>): SimpElement {
  let _key = key;

  if (props && props.key != null) {
    _key = props.key;
  }

  if (_key != null) {
    (props ||= {}).key = _key;
  }

  return createElement(type, props);
}

export { jsx as jsxs, jsx as jsxDEV };
export { Fragment };

export type * from './public.js';
