import type { Nullable, SimpText } from '@simpreact/shared';
import { isSimpText } from '@simpreact/shared';
import type { ComponentStore } from './component.js';
import { Fragment } from './fragment.js';
import type { HostReference } from './hostAdapter.js';

export type SimpNode = SimpElement | SimpText | Array<SimpNode> | boolean | null | undefined;

export type Key = string | number | bigint;

export type FC = (props: any) => SimpNode;

export const SIMP_ELEMENT_FLAG_HOST = 1;
export const SIMP_ELEMENT_FLAG_FC = 1 << 1;
export const SIMP_ELEMENT_FLAG_TEXT = 1 << 2;
export const SIMP_ELEMENT_FLAG_PORTAL = 1 << 3;
export const SIMP_ELEMENT_FLAG_FRAGMENT = 1 << 4;

export const SIMP_ELEMENT_CHILD_FLAG_EMPTY = 1;
export const SIMP_ELEMENT_CHILD_FLAG_UNKNOWN = 1 << 1;
export const SIMP_ELEMENT_CHILD_FLAG_ELEMENT = 1 << 2;
export const SIMP_ELEMENT_CHILD_FLAG_LIST = 1 << 3;
export const SIMP_ELEMENT_CHILD_FLAG_TEXT = 1 << 4;

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

  childFlag: number;

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
      const arr = [];
      for (let i = 2; i < argLength; i++) {
        arr.push(arguments[i]);
      }
      definedChildren = arr;
    }
  }

  definedChildren = definedChildren === undefined ? props?.children : definedChildren;

  switch (typeof type) {
    case 'string': {
      if (!isSimpText(definedChildren)) {
        return normalizeChildren(
          {
            flag: SIMP_ELEMENT_FLAG_HOST,
            childFlag: SIMP_ELEMENT_CHILD_FLAG_UNKNOWN,
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
          },
          definedChildren,
          false
        );
      }

      let childFlag = SIMP_ELEMENT_CHILD_FLAG_EMPTY;
      definedChildren = definedChildren.toString();

      if (definedChildren !== '') {
        (props ||= {}).children = definedChildren;
        childFlag = SIMP_ELEMENT_CHILD_FLAG_TEXT;
      }

      return {
        flag: SIMP_ELEMENT_FLAG_HOST,
        childFlag,
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
        flag: SIMP_ELEMENT_FLAG_FC,
        childFlag: SIMP_ELEMENT_CHILD_FLAG_UNKNOWN,
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
      return normalizeChildren(
        {
          flag: SIMP_ELEMENT_FLAG_FRAGMENT,
          childFlag: SIMP_ELEMENT_CHILD_FLAG_UNKNOWN,
          parent: null,
          key: props?.key || null,
          type: null,
          props: null,
          children: null,
          className: null,
          reference: null,
          store: null,
          context: null,
          ref: null,
          unmounted: null,
        },
        definedChildren,
        false
      );
    }
  }
}

export function createTextElement(text: SimpText): SimpElement {
  return {
    flag: SIMP_ELEMENT_FLAG_TEXT,
    childFlag: SIMP_ELEMENT_CHILD_FLAG_TEXT,
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

export function normalizeChildren(element: SimpElement, children: SimpNode, skipIgnoredCheck: boolean): SimpElement {
  if (!skipIgnoredCheck && isIgnoredNode(children)) {
    element.childFlag = SIMP_ELEMENT_CHILD_FLAG_EMPTY;
    element.children = null;
    return element;
  }

  const result: SimpElement[] = [];

  normalizeNode(children, result, undefined, true);

  if (result.length === 0) {
    element.childFlag = SIMP_ELEMENT_CHILD_FLAG_EMPTY;
    element.children = null;
    return element;
  }

  if (result.length === 1) {
    element.childFlag = SIMP_ELEMENT_CHILD_FLAG_ELEMENT;
    element.children = result[0]!;
    return element;
  }

  element.childFlag = SIMP_ELEMENT_CHILD_FLAG_LIST;
  element.children = result;
  return element;
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

export function normalizeRoot(element: SimpElement, node: SimpNode, skipIgnoredCheck: boolean): SimpElement {
  if (!skipIgnoredCheck && isIgnoredNode(node)) {
    element.childFlag = SIMP_ELEMENT_CHILD_FLAG_EMPTY;
    element.children = null;
    return element;
  }

  if (isSimpText(node)) {
    element.childFlag = SIMP_ELEMENT_CHILD_FLAG_ELEMENT;
    element.children = createTextElement(node);
    return element;
  }

  if (!Array.isArray(node)) {
    element.childFlag = SIMP_ELEMENT_CHILD_FLAG_ELEMENT;
    element.children = node as SimpElement;
    return element;
  }

  normalizeChildren(element, node, true);

  if (element.childFlag === SIMP_ELEMENT_CHILD_FLAG_ELEMENT) {
    return element;
  }

  if (element.childFlag === SIMP_ELEMENT_CHILD_FLAG_EMPTY) {
    return element;
  }

  element.childFlag = SIMP_ELEMENT_CHILD_FLAG_ELEMENT;
  element.children = createElement(Fragment, { children: element.children });
  return element;
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
  if ((node.flag & SIMP_ELEMENT_FLAG_FRAGMENT) !== 0 || (node.flag & SIMP_ELEMENT_FLAG_PORTAL) !== 0) {
    return node.children == null;
  }
  return false;
}
