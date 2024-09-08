import type { Maybe } from '../types';
import type { Attrs, DomNode } from './types';

export function updateDomNodeAttrs(node: Maybe<DomNode>, prevAttrs: Maybe<Attrs>, nextAttrs: Maybe<Attrs>): void {
  if (!node) {
    return;
  }

  for (let name in prevAttrs) {
    if (prevAttrs[name] === nextAttrs?.[name]) {
      continue;
    }

    if (isEventAttrName(name)) {
      removeEventListener(node, name, prevAttrs[name]);
    } else if (name === 'children') {
      if (isPrimitive(prevAttrs[name])) {
        (node as any)['textContent'] = '';
      }
    } else {
      updateAttribute(node, name, '');
    }
  }

  for (let name in nextAttrs) {
    if (prevAttrs?.[name] === nextAttrs[name]) {
      continue;
    }

    if (isEventAttrName(name)) {
      addEventListener(node, name, nextAttrs[name]);
    } else if (name === 'children') {
      if (isPrimitive(nextAttrs[name])) {
        (node as any)['textContent'] = nextAttrs[name] ?? '';
      }
    } else {
      updateAttribute(node, name, nextAttrs[name]);
    }
  }
}

function removeEventListener(node: DomNode, name: string, value: unknown): void {
  if (value != null) {
    node.removeEventListener(name.toLowerCase().substring(2), value as EventListenerOrEventListenerObject);
  }
}

function addEventListener(node: DomNode, name: string, value: unknown): void {
  if (value != null) {
    node.addEventListener(name.toLowerCase().substring(2), value as EventListenerOrEventListenerObject);
  }
}

function updateAttribute(node: DomNode, name: string, value: unknown): void {
  (node as any)[name] = value ?? '';
}

function isEventAttrName(name: string): boolean {
  return name[0] === 'o' && name[1] === 'n';
}

function isPrimitive(value: unknown): boolean {
  return typeof value === 'string' || typeof value === 'number' || value == null;
}
