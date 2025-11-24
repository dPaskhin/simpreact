import type { HostAdapter } from '@simpreact/internal';

import { attachElementToDom } from './attach-element-to-dom.js';
import type { Namespace } from './namespace.js';
import { defaultNamespace } from './namespace.js';
import { mountProps, patchProps, unmountProps } from './props/index.js';

export const domAdapter: HostAdapter<HTMLElement | SVGElement, Text, Namespace> = {
  createReference(type, namespace) {
    if (namespace) {
      return document.createElementNS(namespace, type) as SVGElement;
    } else {
      return document.createElement(type);
    }
  },
  createTextReference(text) {
    return document.createTextNode(text);
  },

  mountProps(dom, element, namespace) {
    mountProps(dom, element, namespace || defaultNamespace);
  },

  patchProps(dom, prevElement, nextElement, namespace) {
    patchProps(dom, prevElement, nextElement, namespace || defaultNamespace);
  },

  unmountProps(dom, element) {
    unmountProps(dom, element);
  },

  setClassname(reference, className, namespace) {
    if (!className) {
      reference.removeAttribute('class');
    } else if (namespace === 'http://www.w3.org/2000/svg') {
      reference.setAttribute('class', className);
    } else {
      (reference as HTMLElement).className = className;
    }
  },

  setTextContent(reference, text, referenceHasOnlyTextElement) {
    if (referenceHasOnlyTextElement) {
      reference.firstChild!.nodeValue = text;
    } else {
      reference.textContent = text;
    }
  },

  appendChild(parent, child) {
    parent.appendChild(child);
  },

  insertBefore(parent, child, before) {
    parent.insertBefore(child, before);
  },

  insertOrAppend(parent, child, before) {
    if (before) {
      domAdapter.insertBefore(parent, child, before);
    } else {
      domAdapter.appendChild(parent, child);
    }
  },

  removeChild(parent, child) {
    parent.removeChild(child);
  },

  replaceChild(parent, replacer, toBeReplaced) {
    parent.replaceChild(replacer, toBeReplaced);
  },

  findParentReference(reference) {
    return reference.parentElement as HTMLElement | SVGElement;
  },

  findNextSiblingReference(reference) {
    return reference.nextSibling as HTMLElement | SVGElement;
  },

  clearNode(reference) {
    reference.textContent = '';
  },

  attachElementToReference(element, reference) {
    attachElementToDom(element, reference);
  },

  getHostNamespaces(element, currentNamespace) {
    if (element.type === 'svg') {
      return {
        self: 'http://www.w3.org/2000/svg',
        children: 'http://www.w3.org/2000/svg',
      };
    }
    if (element.type === 'foreignObject') {
      return { self: 'http://www.w3.org/2000/svg', children: null };
    }
    if (currentNamespace && currentNamespace !== 'http://www.w3.org/1999/xhtml') {
      return { self: currentNamespace, children: currentNamespace };
    }
    return null;
  },
};
