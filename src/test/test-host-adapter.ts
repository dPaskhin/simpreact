import type { HostAdapter } from '../main/core/hostAdapter';
import { Element, Text } from 'flyweight-dom';
import type { Dict } from '../main/shared';
import { vi } from 'vitest';
import { attachElementToDom } from '../main/dom/attach-element-to-dom';

export const testHostAdapter: HostAdapter<Element, Text> = {
  createReference(type) {
    return new Element(type);
  },
  createTextReference(text) {
    const node = new Text();
    node.textContent = text;
    return node;
  },
  mountProps(reference, props) {
    mountProps(props, reference);
  },

  patchProp(reference, propName, prevValue, nextValue) {
    patchProp(propName, prevValue, nextValue, reference);
  },

  setClassname(reference, className) {
    if (!className) {
      reference.removeAttribute('class');
    } else {
      reference.className = className;
    }
  },

  setTextContent(reference, text) {
    reference.textContent = text;
  },

  appendChild(parent, child) {
    parent.appendChild(child);
  },

  insertBefore(parent, child, before) {
    parent.insertBefore(child, before);
  },

  insertOrAppend(parent, child, before) {
    if (before) {
      testHostAdapter.insertBefore(parent, child, before);
    } else {
      testHostAdapter.appendChild(parent, child);
    }
  },

  removeChild(parent, child) {
    parent.removeChild(child);
  },

  replaceChild(parent, replacer, child) {
    parent.replaceChild(child, replacer);
  },

  findParentReference(reference) {
    return reference.parentElement as Element;
  },

  clearNode(reference) {
    reference.textContent = '';
  },

  attachElementToReference(element, reference) {
    attachElementToDom(element, reference as any);
  },
};

export function spyOnHostAdapterMethods(): Record<keyof HostAdapter, ReturnType<typeof vi.spyOn>> {
  return {
    appendChild: vi.spyOn(testHostAdapter, 'appendChild'),
    createReference: vi.spyOn(testHostAdapter, 'createReference') as any,
    createTextReference: vi.spyOn(testHostAdapter, 'createTextReference') as any,
    findParentReference: vi.spyOn(testHostAdapter, 'findParentReference') as any,
    insertBefore: vi.spyOn(testHostAdapter, 'insertBefore'),
    insertOrAppend: vi.spyOn(testHostAdapter, 'insertOrAppend'),
    mountProps: vi.spyOn(testHostAdapter, 'mountProps'),
    patchProp: vi.spyOn(testHostAdapter, 'patchProp'),
    removeChild: vi.spyOn(testHostAdapter, 'removeChild'),
    replaceChild: vi.spyOn(testHostAdapter, 'replaceChild'),
    setClassname: vi.spyOn(testHostAdapter, 'setClassname'),
    setTextContent: vi.spyOn(testHostAdapter, 'setTextContent'),
    clearNode: vi.spyOn(testHostAdapter, 'clearNode'),
    attachElementToReference: vi.spyOn(testHostAdapter, 'attachElementToReference'),
  };
}

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
