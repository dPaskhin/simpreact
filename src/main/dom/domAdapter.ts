import type { Dict, Maybe } from '@simpreact/shared';
import type { HostAdapter, SimpElement } from '@simpreact/internal';
import { unmount, unmountAllChildren } from '@simpreact/internal';

import { isPropNameEventName, patchEvent } from './events';
import { attachElementToDom } from './attach-element-to-dom';

type Namespace = 'http://www.w3.org/1999/xhtml' | 'http://www.w3.org/2000/svg' | (string & {});

const defaultNamespace = 'http://www.w3.org/1999/xhtml';

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

  mountProps(reference, props, prevElement, nextElement, namespace) {
    mountProps(props, reference, prevElement, nextElement, namespace || defaultNamespace);
  },

  patchProp(reference, prevElement, nextElement, propName, prevValue, nextValue, namespace) {
    patchProp(propName, reference, prevElement, nextElement, prevValue, nextValue, namespace || defaultNamespace);
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
      return { self: 'http://www.w3.org/2000/svg', children: 'http://www.w3.org/2000/svg' };
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

function mountProps(
  props: Dict,
  reference: HTMLElement | SVGElement,
  prevElement: Maybe<SimpElement>,
  nextElement: Maybe<SimpElement>,
  namespace: Namespace
): void {
  for (const propName in props) {
    patchProp(propName, reference, prevElement, nextElement, null, props[propName], namespace);
  }
}

function patchProp(
  propName: string,
  dom: HTMLElement | SVGElement,
  prevElement: Maybe<SimpElement>,
  nextElement: Maybe<SimpElement>,
  prevValue: any,
  nextValue: any,
  namespace: Namespace
): void {
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
    case 'autoFocus':
      (dom as { autofocus: boolean }).autofocus = !!nextValue;
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
    case 'volume':
      patchDomProp(nextValue, dom, propName);
      break;
    case 'style':
      patchStyle(prevValue, nextValue, dom);
      break;
    case 'dangerouslySetInnerHTML':
      patchDangerInnerHTML(prevValue, nextValue, prevElement, nextElement, dom);
      break;
    default:
      if (isPropNameEventName(propName)) {
        patchEvent(propName, prevValue, nextValue, dom);
      } else if (nextValue == null) {
        dom.removeAttribute(propName);
      } else {
        if (namespace === 'http://www.w3.org/2000/svg' && svgAttrsNamespaces[propName]) {
          dom.setAttributeNS(svgAttrsNamespaces[propName], propName, nextValue);
        } else {
          dom.setAttribute(propName, nextValue);
        }
      }
  }
}

function patchDomProp(nextValue: unknown, dom: HTMLElement | SVGElement, propKey: string): void {
  const value = nextValue == null ? '' : nextValue;
  if ((dom as any)[propKey] !== value) {
    (dom as any)[propKey] = value;
  }
}

function patchStyle(prevAttrValue: any, nextAttrValue: any, dom: HTMLElement | SVGElement): void {
  if (nextAttrValue == null) {
    dom.removeAttribute('style');
    return;
  }

  const domStyle = dom.style;
  let style;
  let value;

  if (typeof nextAttrValue === 'string') {
    domStyle.cssText = nextAttrValue;
    return;
  }

  if (prevAttrValue != null && typeof prevAttrValue !== 'string') {
    for (style in nextAttrValue) {
      value = nextAttrValue[style];
      if (value !== prevAttrValue[style]) {
        domStyle.setProperty(style, value);
      }
    }

    for (style in prevAttrValue) {
      if (nextAttrValue[style] == null) {
        domStyle.removeProperty(style);
      }
    }
  } else {
    for (style in nextAttrValue) {
      value = nextAttrValue[style];
      domStyle.setProperty(style, value);
    }
  }
}

export function patchDangerInnerHTML(
  prevValue: Maybe<{ __html: string }>,
  nextValue: Maybe<{ __html: string }>,
  prevElement: Maybe<SimpElement>,
  nextElement: Maybe<SimpElement>,
  dom: Element
): void {
  if (!nextElement) {
    return;
  }

  const nextHTML = nextValue?.__html ?? '';

  if (!prevElement) {
    if (nextElement.children) {
      warnAboutUsingChildrenAndDangerouslySetInnerHTML();
      nextElement.children = undefined;
    }

    dom.innerHTML = nextHTML;
    return;
  }

  if (prevValue && !nextValue) {
    dom.innerHTML = '';
    return;
  }

  const shouldPatch = (!prevValue && nextValue) || (prevValue && nextValue && prevValue.__html !== nextValue.__html);

  if (shouldPatch && prevElement.children) {
    if (Array.isArray(prevElement.children)) {
      unmountAllChildren(prevElement.children as SimpElement[]);
    } else {
      unmount(prevElement.children as SimpElement);
    }
    prevElement.children = undefined;
  }

  if (shouldPatch && nextElement.children) {
    warnAboutUsingChildrenAndDangerouslySetInnerHTML();
    nextElement.children = undefined;
  }

  if (shouldPatch) {
    dom.innerHTML = nextHTML;
  }
}

function warnAboutUsingChildrenAndDangerouslySetInnerHTML() {
  console.warn('Avoid setting both `children` and `props.dangerouslySetInnerHTML` simultaneously.');
}

const svgAttrsNamespaces: Record<string, string> = {
  'xlink:actuate': 'http://www.w3.org/1999/xlink',
  'xlink:arcrole': 'http://www.w3.org/1999/xlink',
  'xlink:href': 'http://www.w3.org/1999/xlink',
  'xlink:role': 'http://www.w3.org/1999/xlink',
  'xlink:show': 'http://www.w3.org/1999/xlink',
  'xlink:title': 'http://www.w3.org/1999/xlink',
  'xlink:type': 'http://www.w3.org/1999/xlink',
  'xml:base': 'http://www.w3.org/XML/1998/namespace',
  'xml:lang': 'http://www.w3.org/XML/1998/namespace',
  'xml:space': 'http://www.w3.org/XML/1998/namespace',
};
