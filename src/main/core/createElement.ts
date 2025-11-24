import type { Many, Nullable, SimpText } from '@simpreact/shared';
import { isSimpText } from '@simpreact/shared';
import type { ComponentStore } from './component.js';
import { Fragment } from './fragment.js';
import type { HostReference } from './hostAdapter.js';

export type SimpNode = SimpElement | SimpText | Array<SimpNode> | boolean | null | undefined;

export type Key = string | number | bigint;

export type FC = (props: any) => SimpNode;

export const SimpElementFlag = Object.freeze({
  HOST: 1,
  FC: 1 << 2,
  TEXT: 1 << 3,
  FRAGMENT: 1 << 4,
  PORTAL: 1 << 5,
});

// This object also serves as a persistent identity for elements, making it useful
// for tracking them consistently across rerenders.
export interface SimpElementStore {
  componentStore: Nullable<ComponentStore>;

  latestElement: Nullable<SimpElement>;

  hostNamespace: Nullable<string>;

  [key: string]: unknown;
}

export function createElementStore(): SimpElementStore {
  return { componentStore: null, latestElement: null, hostNamespace: null };
}

export interface SimpElement {
  flag: number;

  parent: Nullable<SimpElement>;

  key: Nullable<Key>;

  type: Nullable<string | FC>;

  props: any;

  children: SimpNode;

  className: Nullable<string>;

  reference: Nullable<HostReference>;

  store: Nullable<SimpElementStore>;

  context: any;

  ref: any;

  unmounted: Nullable<boolean>;
}

export function createElement(type: string | FC, props?: any, ...children: SimpNode[]): SimpElement;
export function createElement(type: string | FC, props?: any): SimpElement {
  let definedChildren: SimpNode;

  const argLength = arguments.length;
  if (argLength > 2) {
    if (argLength === 3) {
      definedChildren = arguments[2];
    } else {
      const arr = new Array(argLength - 2);
      for (let i = 2; i < argLength; i++) {
        arr[i - 2] = arguments[i];
      }
      definedChildren = arr;
    }
  }

  definedChildren = definedChildren === undefined ? props?.children : definedChildren;

  switch (typeof type) {
    case 'string': {
      if (!isSimpText(definedChildren)) {
        return {
          flag: SimpElementFlag.HOST,
          parent: null,
          key: props?.key || null,
          type,
          props: props || null,
          children: normalizeChildren(definedChildren, false),
          className: props?.className || null,
          reference: null,
          store: null,
          context: null,
          ref: props?.ref ? { value: props.ref } : null,
          unmounted: null,
        };
      }

      definedChildren = definedChildren.toString();

      if (definedChildren !== '') {
        (props ||= {}).children = definedChildren;
      }

      return {
        flag: SimpElementFlag.HOST,
        parent: null,
        key: props?.key || null,
        type,
        props: props || null,
        children: null,
        className: props?.className || null,
        reference: null,
        store: null,
        context: null,
        ref: props?.ref ? { value: props.ref } : null,
        unmounted: null,
      };
    }
    case 'function': {
      if (definedChildren !== undefined) {
        (props ||= {}).children = definedChildren;
      }

      return {
        flag: SimpElementFlag.FC,
        parent: null,
        key: props?.key || null,
        type,
        props: props || null,
        children: null,
        className: null,
        reference: null,
        store: null,
        context: null,
        ref: null,
        unmounted: null,
      };
    }
    default: {
      return {
        flag: SimpElementFlag.FRAGMENT,
        parent: null,
        key: props?.key || null,
        type: null,
        props: null,
        children: normalizeChildren(definedChildren, false),
        className: null,
        reference: null,
        store: null,
        context: null,
        ref: null,
        unmounted: null,
      };
    }
  }
}

export function createTextElement(text: SimpText): SimpElement {
  return {
    flag: SimpElementFlag.TEXT,
    parent: null,
    key: null,
    type: null,
    props: null,
    children: text.toString(),
    className: null,
    reference: null,
    store: null,
    context: null,
    ref: null,
    unmounted: null,
  };
}

export function normalizeChildren(children: SimpNode, skipIgnoredCheck: boolean): Nullable<Many<SimpElement>> {
  if (!skipIgnoredCheck && isIgnoredNode(children)) {
    return null;
  }

  const result: SimpElement[] = [];

  normalizeNode(children, result, undefined, true);

  if (result.length === 0) {
    return null;
  }

  return result.length === 1 ? result[0] || null : result;
}

function normalizeNode(child: SimpNode, result: SimpElement[], currentKey = '', skipIgnoredCheck: boolean): void {
  if (!skipIgnoredCheck && isIgnoredNode(child)) {
    return;
  }

  if (isSimpText(child)) {
    child = createTextElement(child);
    child.key =
      currentKey ||
      // Hack to treat a single child as a one-item list for more consistent reconciliation.
      '.0';
    result.push(child);
    return;
  }

  if (Array.isArray(child)) {
    for (let i = 0; i < child.length; i++) {
      normalizeNode(child[i], result, currentKey + '.' + i, false);
    }
    return;
  }

  if ((child as SimpElement).key) {
    currentKey = currentKey.slice(0, -2) + (child as SimpElement).key;
  }
  (child as SimpElement).key =
    currentKey ||
    // Hack to treat a single child as a one-item list for more consistent reconciliation.
    '.0';
  result.push(child as SimpElement);
}

export function normalizeRoot(node: SimpNode, skipIgnoredCheck: boolean): Nullable<SimpElement> {
  if (!skipIgnoredCheck && isIgnoredNode(node)) {
    return null;
  }

  if (isSimpText(node)) {
    return createTextElement(node);
  }

  if (!Array.isArray(node)) {
    return node as SimpElement;
  }

  node = normalizeChildren(node, true);
  if (Array.isArray(node)) {
    return createElement(Fragment, { children: node });
  }
  return node;
}

function isIgnoredNode(node: SimpNode): node is Extract<SimpNode, '' | null | undefined | boolean> {
  if (node == null || typeof node === 'boolean' || node === '') {
    return true;
  }
  if (Array.isArray(node)) {
    return node.length === 0;
  }
  if (isSimpText(node)) {
    return false;
  }
  if (node.flag === SimpElementFlag.FRAGMENT || node.flag === SimpElementFlag.PORTAL) {
    return node.children == null;
  }
  return false;
}
