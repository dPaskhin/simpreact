import type { FunctionComponent, SimpElement } from '../core';
import { createElement, Fragment } from '../core';
import type { Maybe } from '../shared';
import type { Key, Props } from '../core/createElement';

export function jsx(type: string | FunctionComponent<any>, props?: Maybe<Props>, key?: Maybe<Key>): SimpElement {
  let _key: Maybe<Key>;

  if (key != null) {
    _key = key;
  }

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
