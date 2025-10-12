import * as SimpReactInternal from '@simpreact/internal';
import * as SimpReactHooks from '@simpreact/hooks';

export const Children = {
  map(
    children: SimpReactInternal.SimpNode,
    fn: (child: SimpReactInternal.SimpNode, index: number) => SimpReactInternal.SimpNode
  ): SimpReactInternal.SimpNode[] {
    return Children.toArray(children).map(fn);
  },

  forEach(children: SimpReactInternal.SimpNode, fn: (child: SimpReactInternal.SimpNode, index: number) => void): void {
    Children.toArray(children).forEach(fn);
  },

  count(children: SimpReactInternal.SimpNode): number {
    return Children.toArray(children).length;
  },

  toArray(children: SimpReactInternal.SimpNode): SimpReactInternal.SimpNode[] {
    const result: SimpReactInternal.SimpNode[] = [];

    function traverse(node: SimpReactInternal.SimpNode) {
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

  only(children: SimpReactInternal.SimpNode): SimpReactInternal.SimpElement {
    const array = Children.toArray(children);
    if (array.length !== 1 || !isValidElement(array[0])) {
      throw new Error('Children.only expected a single SimpElement child.');
    }
    return array[0] as SimpReactInternal.SimpElement;
  },
};

export function cloneElement(
  element: SimpReactInternal.SimpElement,
  props?: any,
  ...children: SimpReactInternal.SimpNode[]
): SimpReactInternal.SimpElement {
  if (!isValidElement(element)) {
    throw new Error(`cloneElement: expected a SimpElement, got ${element}`);
  }
  if (element.flag === SimpReactInternal.SimpElementFlag.PORTAL) {
    throw new Error('cloneElement: the argument must be a SimpElement, but you passed a portal instead.');
  }

  return SimpReactInternal.createElement(
    element.flag === SimpReactInternal.SimpElementFlag.FRAGMENT ? SimpReactInternal.Fragment : element.type!,
    Object.assign({}, element.props, props),
    arguments.length > 2 ? children : props.children || element.children
  );
}

export function isValidElement(element: unknown): element is SimpReactInternal.SimpElement {
  return typeof element === 'object' && element !== null && 'flag' in element;
}

export function Suspense(props: {
  fallback: SimpReactInternal.SimpNode;
  children: SimpReactInternal.SimpNode;
}): SimpReactInternal.SimpNode {
  const [isSuspended, setIsSuspended] = SimpReactHooks.useState(false);

  SimpReactHooks.useCatch(error => {
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

export function StrictMode(props: { children: SimpReactInternal.SimpNode }): SimpReactInternal.SimpNode {
  return props.children;
}

export function forwardRef<P, T>(Component: (props: P, ref: SimpReactInternal.Ref<T>) => any) {
  return function Forwarded(props: P) {
    return Component(props, (props as { ref: SimpReactInternal.Ref<T> })?.ref || null);
  };
}

export const Fragment = SimpReactInternal.Fragment;
export const createElement = SimpReactInternal.createElement;
export const createPortal = SimpReactInternal.createPortal;
export const memo = SimpReactInternal.memo;
export const flushSync = (value: any) => value;

export class Component {
  constructor() {
    throw new Error('Not implemented.');
  }
}

export default {
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
  Component,
};
