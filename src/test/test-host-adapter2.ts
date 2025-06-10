import type { HostAdapter } from '../main/core/hostAdapter';
import { Element, Text } from 'flyweight-dom';
import { vi } from 'vitest';
import type { Dict } from '../main/shared';

export const testHostAdapter: HostAdapter<Element, Text> = {
  createReference: vi.fn(type => {
    return new Element(type);
  }),
  createTextReference: vi.fn(text => {
    const node = new Text();
    node.textContent = text;
    return node;
  }),
  mountProps: vi.fn((reference, props) => {
    mountProps(props, reference);
  }),

  patchProp: vi.fn((reference, propName, prevValue, nextValue) => {
    patchProp(propName, prevValue, nextValue, reference);
  }),

  setClassname: vi.fn((reference, className) => {
    if (!className) {
      reference.removeAttribute('class');
    } else {
      reference.className = className;
    }
  }),

  setTextContent: vi.fn((reference, text) => {
    reference.textContent = text;
  }),

  appendChild: vi.fn((parent, child) => {
    parent.appendChild(child);
  }),

  insertBefore: vi.fn((parent, child, before) => {
    parent.insertBefore(child, before);
  }),

  insertOrAppend: vi.fn((parent, child, before) => {
    if (before) {
      testHostAdapter.insertBefore(parent, child, before);
    } else {
      testHostAdapter.appendChild(parent, child);
    }
  }),

  removeChild: vi.fn((parent, child) => {
    parent.removeChild(child);
  }),

  replaceChild: vi.fn((parent, replacer, toBeReplaced) => {
    parent.replaceChild(toBeReplaced, replacer);
  }),

  findParentReference: vi.fn(reference => {
    return reference.parentElement as Element;
  }),

  clearNode: vi.fn(reference => {
    reference.textContent = '';
  }),
};

function mountProps(props: Dict, reference: Element): void {
  for (const propsKey in props) {
    patchProp(propsKey, null, props[propsKey], reference);
  }
}

function patchProp(propName: string, prevValue: any, nextValue: any, dom: Element): void {
  switch (propName) {
    case 'children':
    case 'childrenType':
    case 'className':
    case 'defaultValue':
    case 'key':
    case 'multiple':
    case 'ref':
    case 'selectedIndex':
      break;
    case 'allowfullscreen':
    case 'autoplay':
    case 'capture':
    case 'checked':
    case 'controls':
    case 'default':
    case 'disabled':
    case 'hidden':
    case 'indeterminate':
    case 'loop':
    case 'muted':
    case 'novalidate':
    case 'open':
    case 'readOnly':
    case 'required':
    case 'reversed':
    case 'scoped':
    case 'seamless':
    case 'selected':
      (dom as any)[propName] = !!nextValue;
      break;
    case 'defaultChecked':
    case 'value':
    default:
      if (nextValue == null) {
        dom.removeAttribute(propName);
      } else {
        dom.setAttribute(propName, nextValue);
      }
      break;
  }
}
