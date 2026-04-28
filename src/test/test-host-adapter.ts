import type { HostAdapter } from '@simpreact/internal';
import { vi } from 'vitest';

export const testHostAdapter: HostAdapter<Element, Text> = {
  createReference: vi.fn(type => {
    return document.createElement(type);
  }),
  createTextReference: vi.fn(text => {
    const node = document.createTextNode(text);
    node.textContent = text;
    return node;
  }),
  mountProps: vi.fn(),

  patchProps: vi.fn(),

  unmountProps: vi.fn(),

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

  insertOrAppend: vi.fn((parent, child, before) => {
    if (before) {
      parent.insertBefore(child, before);
    } else {
      parent.appendChild(child);
    }
  }),

  removeChild: vi.fn((parent, child) => {
    parent.removeChild(child);
  }),

  replaceChild: vi.fn((parent, replacer, toBeReplaced) => {
    parent.replaceChild(replacer, toBeReplaced);
  }),

  clearNode: vi.fn(reference => {
    reference.textContent = '';
  }),

  attachElementToReference: vi.fn((element, reference) => {
    reference.__SIMP_ELEMENT__ = element;
  }),

  getElementFromReference: vi.fn(reference => {
    return (reference as any).__SIMP_ELEMENT__;
  }),

  getHostNamespaces: vi.fn(() => ({ self: '', children: '' })),
};
