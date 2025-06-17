import type { HostAdapter } from '../main/core/hostAdapter';
import { Element, Text } from 'flyweight-dom';
import { vi } from 'vitest';
import { attachElementToDom } from '../main/dom/attach-element-to-dom';

export const testHostAdapter: HostAdapter<Element, Text> = {
  createReference: vi.fn(type => {
    return new Element(type);
  }),
  createTextReference: vi.fn(text => {
    const node = new Text();
    node.textContent = text;
    return node;
  }),
  mountProps: vi.fn(() => {
    // noop
  }),

  patchProp: vi.fn(() => {
    // noop
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

  attachElementToReference: vi.fn((element, reference) => {
    attachElementToDom(element, reference);
  }),
};
