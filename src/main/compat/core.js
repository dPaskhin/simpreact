import {
  createElement as _createElement,
  createPortal as _createPortal,
  Fragment as _Fragment,
  memo as _memo,
} from '@simpreact/core';
import { isFragment, isPortal } from '@simpreact/internal';
import { useCatch, useState } from './hooks.js';

export const Children = {
  map(children, fn) {
    return Children.toArray(children).map(fn);
  },

  forEach(children, fn) {
    Children.toArray(children).forEach(fn);
  },

  count(children) {
    return Children.toArray(children).length;
  },

  toArray(children) {
    const result = [];

    function traverse(node) {
      if (node == null || typeof node === 'boolean') {
        return;
      }

      if (Array.isArray(node)) {
        for (const child of node) {
          traverse(child);
        }
        return;
      }

      result.push(node);
    }

    traverse(children);
    return result;
  },

  only(children) {
    const array = Children.toArray(children);
    if (array.length !== 1 || !isValidElement(array[0])) {
      throw new Error('Children.only expected a single SimpElement child.');
    }
    return array[0];
  },
};

export function cloneElement(element, props, ...children) {
  if (!isValidElement(element)) {
    throw new Error(`cloneElement: expected a SimpElement, got ${element}`);
  }
  if (isPortal(element)) {
    throw new Error('cloneElement: the argument must be a SimpElement, but you passed a portal instead.');
  }

  return createElement(
    isFragment(element) ? Fragment : element.type,
    Object.assign({}, element.props, props),
    arguments.length > 2 ? children : props.children || element.children
  );
}

export function isValidElement(element) {
  return typeof element === 'object' && element !== null && 'flag' in element;
}

export function Suspense(props) {
  const [isSuspended, setIsSuspended] = useState(false);

  useCatch(error => {
    if (!(error instanceof Promise)) {
      throw error;
    }

    if (isSuspended) {
      return;
    }

    setIsSuspended(true);
    error.then(() => setIsSuspended(false));
  });

  return isSuspended ? props.fallback : props.children;
}

export function StrictMode(props) {
  return props.children;
}

export function forwardRef(Component) {
  return function Forwarded(props) {
    return Component(props, props?.ref ?? null);
  };
}

export const version = '18.3.1';

export const Fragment = _Fragment;
export const createElement = _createElement;
export const createPortal = _createPortal;
export const memo = _memo;
export const flushSync = callback => callback();

export function lazy(factory) {
  let state = null;

  return function LazyComponent(props) {
    if (state === null) {
      const promise = factory().then(
        mod => {
          state = { status: 'resolved', component: mod.default };
        },
        reason => {
          state = { status: 'rejected', reason };
        }
      );
      state = { status: 'pending', promise };
    }
    if (state.status === 'pending') {
      throw state.promise;
    }
    if (state.status === 'rejected') {
      throw state.reason;
    }
    return createElement(state.component, props);
  };
}

export class Component {
  constructor() {
    throw new Error('Not implemented.');
  }
}

export default {
  version,
  Children,
  cloneElement,
  isValidElement,
  Suspense,
  StrictMode,
  forwardRef,
  Fragment,
  createElement,
  createPortal,
  memo,
  flushSync,
  lazy,
  Component,
};
