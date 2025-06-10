import type { Many, Maybe, Primitive } from '../shared';
import { isPrimitive } from '../shared';
import { Fragment } from './fragment';
import type { HostReference } from './hostAdapter';
import type { SimpContextMap } from './context';
import { isConsumer, isProvider } from './context';

export type SimpNode = SimpElement | string | number | bigint | Array<SimpNode> | boolean | null | undefined;

export type Props = any;

export type Key = string | number | bigint;

export interface FunctionComponent<P = Props> {
  (props: P): SimpNode;
}

export type FC<P = Props> = FunctionComponent<P>;

export type SimpElementFlag = 'FC' | 'HOST' | 'TEXT' | 'FRAGMENT' | 'PROVIDER' | 'CONSUMER';

export interface SimpElement<T = Props> {
  flag: SimpElementFlag;

  key?: Maybe<Key>;

  type?: Maybe<string | FunctionComponent<T>>;

  props?: Maybe<T>;

  children?: Maybe<SimpNode>;

  className?: Maybe<string>;

  reference?: Maybe<HostReference>;

  store?: unknown;

  contextMap?: Maybe<SimpContextMap>;
}

export function createElement<P = Props>(
  type: string | FunctionComponent<Readonly<P>>,
  props?: Maybe<P>,
  ...children: SimpNode[]
): SimpElement<P> {
  let newProps: Props;
  let className: Maybe<string>;
  let key: Maybe<Key>;
  let definedChildren: SimpNode;
  const childLength = children.length;

  if (childLength === 1) {
    definedChildren = children[0];
  } else if (childLength > 1) {
    definedChildren = [];

    for (let i = 0; i < childLength; i++) {
      definedChildren.push(children[i]);
    }
  }

  if (typeof type === 'string') {
    if (props != null) {
      for (const propName in props) {
        if (propName === 'className') {
          className = props[propName] as any;
        } else if (propName === 'key') {
          key = props[propName] as Key;
        } else if (propName === 'children') {
          if (definedChildren === undefined) {
            definedChildren = props[propName] as any;
          }
        } else {
          (newProps ||= {})[propName] = props[propName];
        }
      }
    }

    const element: SimpElement = {
      flag: 'HOST',
      type,
    };

    if (className) {
      element.className = className;
    }

    if (key) {
      element.key = key;
    }

    if ((definedChildren = normalizeChildren(definedChildren))) {
      element.children = definedChildren;
    }

    if (newProps) {
      element.props = newProps;
    }

    return element;
  } else if (type === Fragment) {
    const element: SimpElement = {
      flag: 'FRAGMENT',
    };

    element.children = normalizeChildren(definedChildren || (props != null ? (props as any).children : null));

    if (props != null && (props as any).key) {
      element.key = (props as any)?.key;
    }

    return element;
  } else if (isProvider(type)) {
    const element: SimpElement = { flag: 'PROVIDER', type, props: { value: (props as any).value } };

    element.children = normalizeChildren(definedChildren || (props as any).children);

    if (props != null && (props as any).key) {
      element.key = (props as any)?.key;
    }

    return element;
  } else if (isConsumer(type)) {
    const element: SimpElement = {
      flag: 'CONSUMER',
      type,
      props: { children: definedChildren || (props != null ? (props as any).children : null) },
    };

    if (props != null && (props as any).key) {
      element.key = (props as any)?.key;
    }

    return element;
  } else {
    if (props != null) {
      for (const propName in props) {
        if (propName === 'key') {
          key = props[propName] as Key;
        } else if (propName === 'children') {
          if (definedChildren === undefined) {
            definedChildren = props[propName] as any;
          }
        } else {
          (newProps ||= {})[propName] = props[propName];
        }
      }
    }

    if (definedChildren !== undefined) {
      (newProps ||= {})['children'] = definedChildren;
    }

    const element: SimpElement = {
      flag: 'FC',
      type,
    };

    if (key) {
      element.key = key;
    }

    if (newProps != null) {
      element.props = newProps;
    }

    return element;
  }
}

export function createTextElement(text: Primitive): SimpElement {
  return {
    flag: 'TEXT',
    children: text == null || text === true || text === false ? '' : text,
  };
}

export function normalizeChildren(children: SimpNode): Maybe<Many<SimpElement>> {
  if (children == null || typeof children === 'boolean') {
    return;
  }

  const result: SimpElement[] = [];

  normalizeNode(children, result);

  if (result.length === 0) {
    return;
  }

  return result.length === 1 ? result[0] : result;
}

function normalizeNode(child: SimpNode, result: SimpElement[]): void {
  if (child == null || typeof child === 'boolean') {
    return;
  }

  if (isPrimitive(child)) {
    result.push(createTextElement(child));
    return;
  }

  if (Array.isArray(child)) {
    for (const nestedChild of child) {
      normalizeNode(nestedChild, result);
    }
    return;
  }

  if (typeof child === 'object') {
    if (typeof child.flag !== 'string') {
      throw new TypeError(`Objects are not valid as a child: ${JSON.stringify(child)}.`);
    }
    result.push(child);
  }
}

export function normalizeRoot(node: SimpNode): SimpElement | undefined {
  if (node == null || typeof node === 'boolean') {
    return;
  }
  if (isPrimitive(node)) {
    return createTextElement(node);
  }
  if (Array.isArray(node)) {
    return createElement(Fragment, { children: node });
  }

  return node;
}
