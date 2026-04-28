import type { HostAdapter } from '@simpreact/internal';
import { attachElementToDom, getElementFromDom } from './attach-element-to-dom.js';
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

  mountProps(dom, element, renderRuntime, namespace) {
    mountProps(dom, element, namespace || defaultNamespace, renderRuntime);
  },

  patchProps(dom, prevElement, nextElement, renderRuntime, namespace) {
    patchProps(dom, prevElement, nextElement, namespace || defaultNamespace, renderRuntime);
  },

  unmountProps(dom, element, renderRuntime) {
    unmountProps(dom, element, renderRuntime);
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

  insertOrAppend(parent, child, before) {
    if (before) {
      parent.insertBefore(child, before);
    } else {
      parent.appendChild(child);
    }
  },

  removeChild(parent, child) {
    parent.removeChild(child);
  },

  replaceChild(parent, replacer, toBeReplaced) {
    parent.replaceChild(replacer, toBeReplaced);
  },

  clearNode(reference) {
    reference.textContent = '';
  },

  attachElementToReference(element, reference, renderRuntime) {
    attachElementToDom(element, reference, renderRuntime);
  },

  getElementFromReference(reference, renderRuntime) {
    return getElementFromDom(reference, renderRuntime);
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
