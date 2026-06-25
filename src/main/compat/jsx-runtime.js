import { Fragment } from '@simpreact/internal';
import { createElement } from './core.js';

export function jsx(type, props, key) {
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

export default {
  jsx,
  jsxDEV: jsx,
  jsxs: jsx,
};
