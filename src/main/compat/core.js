import {
  createElement as _createElement,
  createPortal as _createPortal,
  Fragment as _Fragment,
  memo as _memo,
} from '@simpreact/core';
import { isFragment, isPortal, withSyncRerender } from '@simpreact/internal';
import { useCatch, useState } from './hooks.js';
import { renderRuntime } from './renderRuntime.js';

// Threads refs through FC elements without polluting string-keyed props.
// Symbol keys are invisible to `for…in` and Object.keys, so they never
// accidentally end up on HOST elements via `{...props}` spread.
export const REF_SYMBOL = Symbol('simpreact.compat.ref');

// Wraps core createElement to:
//   1. Strip `ref` from FC props (React's model: ref is not part of props).
//   2. Remap onChange→onInput for text <input> and <textarea> so React-style
//      onChange (fires on every keystroke) works — simpreact's controlled
//      handler calls onInput for that behaviour; onChange maps to native
//      `change` which only fires on blur for text fields.
export function createElement(type, props, ...args) {
  if (props != null && 'onChange' in props && !('onInput' in props)) {
    if (type === 'textarea' || (type === 'input' && props.type !== 'checkbox' && props.type !== 'radio')) {
      const { onChange, ...rest } = props;
      props = { ...rest, onInput: onChange };
    }
  }

  if (typeof type === 'function' && props != null && 'ref' in props) {
    const { ref, ...restProps } = props;
    if (ref != null) {
      restProps[REF_SYMBOL] = ref;
    }
    return _createElement(type, restProps, ...args);
  }
  return _createElement(type, props, ...args);
}

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

  const mergedProps = Object.assign({}, element.props, props);

  const resolvedChildren =
    arguments.length > 2 ? children : mergedProps.children !== undefined ? mergedProps.children : element.children;

  return createElement(isFragment(element) ? Fragment : element.type, mergedProps, resolvedChildren);
}

export function isValidElement(element) {
  return typeof element === 'object' && element !== null && 'flag' in element;
}

export function Suspense(props) {
  const [pendingCount, setPendingCount] = useState(0);

  useCatch(error => {
    if (!(error instanceof Promise)) {
      throw error;
    }
    setPendingCount(c => c + 1);
    error.then(() => setPendingCount(c => c - 1));
  });

  return pendingCount > 0 ? props.fallback : props.children;
}

export function StrictMode(props) {
  return props.children;
}

// Reads the ref from the Symbol slot so that string-keyed `ref` never
// appears in the props the inner component receives.
export function forwardRef(Component) {
  return function Forwarded(props) {
    const ref = props?.[REF_SYMBOL] ?? null;
    if (props != null && REF_SYMBOL in props) {
      const { [REF_SYMBOL]: _, ...restProps } = props;
      return Component(restProps, ref);
    }
    return Component(props, ref);
  };
}

export const version = '18.3.1';

export const Fragment = _Fragment;
export const createPortal = _createPortal;
export const memo = _memo;

// Minimal React / ReactDOM internals shim for react-dom/test-utils.
export const __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = {
  ReactCurrentOwner: { current: null },
  ReactCurrentDispatcher: { current: null },
  ReactCurrentBatchConfig: { transition: null },
  // react-dom/test-utils: var EventInternals = SecretInternals.Events; EventInternals[0..4]
  Events: [
    /* getInstanceFromNode */ _node => null,
    /* getNodeFromInstance */ _inst => null,
    /* getFiberCurrentPropsFromNode */ _node => null,
    /* enqueueStateRestore */ () => {},
    /* restoreStateIfNeeded */ () => {},
  ],
};

// react-dom/test-utils uses React.unstable_act / React.act for flushing updates.
export async function unstable_act(callback) {
  const result = callback();
  if (result && typeof result.then === 'function') await result;
  await Promise.resolve();
}

export { unstable_act as act };

export function flushSync(callback) {
  let result;
  withSyncRerender(renderRuntime, () => {
    result = callback();
  });
  return result;
}

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

// Minimal base class for React-style class components.
// setState and forceUpdate are no-ops here; the compat renderer overrides
// them on each instance with real implementations backed by the render queue.
export class Component {
  constructor(props) {
    this.props = props;
    this.state = {};
  }

  setState(_updater, _callback) {}

  forceUpdate(_callback) {}

  render() {
    throw new Error('Component.render() must be implemented by the subclass.');
  }
}

Component.prototype.isReactComponent = true;

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
  __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED,
  unstable_act,
  act: unstable_act,
};
