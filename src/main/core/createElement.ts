import type { Dict, Many, Maybe, Nullable, SimpText } from '@simpreact/shared';
import { isSimpText } from '@simpreact/shared';

import { Fragment } from './fragment';
import type { HostReference } from './hostAdapter';
import type { SimpContextMap } from './context';
import { isConsumer, isProvider } from './context';

export type SimpNode = SimpElement | SimpText | Array<SimpNode> | boolean | null | undefined;

export type Key = string | number | bigint;

export interface FunctionComponent {
  (props: any): SimpNode;
}

export type FC = FunctionComponent;

export type SimpElementFlag = 'FC' | 'HOST' | 'TEXT' | 'FRAGMENT' | 'PROVIDER' | 'CONSUMER' | 'PORTAL';

export interface SimpElement {
  flag: SimpElementFlag;

  parent: Nullable<SimpElement>;

  key?: Maybe<Key>;

  type?: Maybe<string | FunctionComponent>;

  props?: any;

  children?: Maybe<SimpNode>;

  className?: Maybe<string>;

  reference?: Maybe<HostReference>;

  store?: Dict;

  contextMap?: Maybe<SimpContextMap>;

  ref?: any;
}

export function createElement(type: string | FunctionComponent, props?: any, ...children: SimpNode[]): SimpElement {
  let newProps: any;
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
    let ref;

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
        } else if (propName === 'ref') {
          ref = {
            value: props[propName],
          };
        } else {
          (newProps ||= {})[propName] = props[propName];
        }
      }
    }

    const element: SimpElement = {
      flag: 'HOST',
      type,
      parent: null,
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

    if (ref) {
      element.ref = ref;
    }

    return element;
  } else if (type === Fragment) {
    const element: SimpElement = {
      flag: 'FRAGMENT',
      parent: null,
    };

    element.children = normalizeChildren(definedChildren || (props != null ? (props as any).children : null));

    if (props != null && (props as any).key) {
      element.key = (props as any)?.key;
    }

    return element;
  } else if (isProvider(type)) {
    const element: SimpElement = { flag: 'PROVIDER', type, props: { value: (props as any).value }, parent: null };

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
      parent: null,
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
      parent: null,
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

export function createTextElement(text: SimpText): SimpElement {
  return {
    flag: 'TEXT',
    children: text,
    parent: null,
  };
}

export function normalizeChildren(children: SimpNode): Maybe<Many<SimpElement>> {
  if (children == null || typeof children === 'boolean' || children === '') {
    return;
  }

  const result: SimpElement[] = [];

  normalizeNode(children, result);

  if (result.length === 0) {
    return;
  }

  return result.length === 1 ? result[0] : result;
}

function normalizeNode(child: SimpNode, result: SimpElement[], currentKey = ''): void {
  if (child == null || typeof child === 'boolean' || child === '') {
    return;
  }

  if (isSimpText(child)) {
    child = createTextElement(child);
    if (currentKey !== '') {
      child.key = currentKey;
    }
    result.push(child);
    return;
  }

  if (Array.isArray(child)) {
    for (let i = 0; i < child.length; i++) {
      normalizeNode(child[i], result, currentKey + '.' + i);
    }
    return;
  }

  if (typeof child === 'object') {
    if (typeof child.flag !== 'string') {
      throw new TypeError(`Objects are not valid as a child: ${JSON.stringify(child)}.`);
    }
    if (currentKey !== '') {
      if (child.key) {
        currentKey = currentKey.slice(0, -2) + child.key;
      }
      child.key = currentKey;
    }
    result.push(child);
  }
}

export function normalizeRoot(node: SimpNode): SimpElement | undefined {
  if (node == null || typeof node === 'boolean' || node === '') {
    return;
  }
  if (isSimpText(node)) {
    return createTextElement(node);
  }
  if (Array.isArray(node)) {
    return createElement(Fragment, { children: node });
  }

  return node;
}
