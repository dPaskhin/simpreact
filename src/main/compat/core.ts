import type { FC, Ref, SimpElement, SimpNode } from '@simpreact/core';
import {
  createElement as _createElement,
  createPortal as _createPortal,
  Fragment as _Fragment,
  memo as _memo,
} from '@simpreact/core';
import { SIMP_ELEMENT_FLAG_FRAGMENT, SIMP_ELEMENT_FLAG_PORTAL } from '@simpreact/internal';
import { useCatch, useState } from './hooks.js';

export const Children = {
  map(children: SimpNode, fn: (child: SimpNode, index: number) => SimpNode): SimpNode[] {
    return Children.toArray(children).map(fn);
  },

  forEach(children: SimpNode, fn: (child: SimpNode, index: number) => void): void {
    Children.toArray(children).forEach(fn);
  },

  count(children: SimpNode): number {
    return Children.toArray(children).length;
  },

  toArray(children: SimpNode): SimpNode[] {
    const result: SimpNode[] = [];

    function traverse(node: SimpNode) {
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

  only(children: SimpNode): SimpElement {
    const array = Children.toArray(children);
    if (array.length !== 1 || !isValidElement(array[0])) {
      throw new Error('Children.only expected a single SimpElement child.');
    }
    return array[0] as SimpElement;
  },
};

export function cloneElement(element: SimpElement, props?: any, ...children: SimpNode[]): SimpElement {
  if (!isValidElement(element)) {
    throw new Error(`cloneElement: expected a SimpElement, got ${element}`);
  }
  if (((element as any).flag & SIMP_ELEMENT_FLAG_PORTAL) !== 0) {
    throw new Error('cloneElement: the argument must be a SimpElement, but you passed a portal instead.');
  }

  return createElement(
    ((element as any).flag & SIMP_ELEMENT_FLAG_FRAGMENT) !== 0 ? Fragment : element.type!,
    Object.assign({}, element.props, props),
    arguments.length > 2 ? children : props.children || (element as any).children
  ) as any;
}

export function isValidElement(element: unknown): element is SimpElement {
  return typeof element === 'object' && element !== null && 'flag' in element;
}

export function Suspense(props: { fallback: SimpNode; children: SimpNode }): SimpNode {
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

export function StrictMode(props: { children: SimpNode }): SimpNode {
  return props.children;
}

export function forwardRef<P, T>(Component: (props: P, ref: Ref<T>) => any) {
  return function Forwarded(props: P) {
    return Component(props, (props as { ref: Ref<T> })?.ref || null);
  };
}

export const version = '18.3.1';

export const Fragment = _Fragment;
export const createElement = _createElement;
export const createPortal = _createPortal;
export const memo = _memo;
export const flushSync = <T>(callback: () => T): T => callback();

type LazyState<T extends FC<any>> =
  | { status: 'pending'; promise: Promise<void> }
  | { status: 'resolved'; component: T }
  | { status: 'rejected'; reason: unknown };

export function lazy<T extends FC<any>>(factory: () => Promise<{ default: T }>): FC<any> {
  let state: LazyState<T> | null = null;

  return function LazyComponent(props: any): SimpNode {
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
    return createElement(state.component as any, props) as unknown as SimpNode;
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
