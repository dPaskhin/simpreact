/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Dict } from '../shared';
import type { HostAdapter } from '../core/internal';

export const domAdapter: HostAdapter<HTMLElement, Text> = {
  createReference(type) {
    return document.createElement(type);
  },
  createTextReference(text) {
    return document.createTextNode(text);
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
      domAdapter.insertBefore(parent, child, before);
    } else {
      domAdapter.appendChild(parent, child);
    }
  },

  removeChild(parent, child) {
    parent.removeChild(child);
  },

  replaceChild(parent, replacer, child) {
    parent.replaceChild(child, replacer);
  },

  findParentReference(reference) {
    return reference.parentElement as HTMLElement;
  },
};

function mountProps(props: Dict, reference: HTMLElement): void {
  for (const propsKey in props) {
    patchProp(propsKey, null, props[propsKey], reference);
  }
}

function patchProp(propName: string, prevValue: any, nextValue: any, dom: HTMLElement): void {
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
    default:
      if (propName.charCodeAt(0) === 111 && propName.charCodeAt(1) === 110) {
        patchEvent(propName, prevValue, nextValue, dom);
      } else if (nextValue == null) {
        dom.removeAttribute(propName);
      } else {
        dom.setAttribute(propName, nextValue);
      }
      break;
  }
}

function patchDomProp(nextValue: unknown, dom: HTMLElement, propKey: string): void {
  const value = nextValue == null ? '' : nextValue;
  if ((dom as any)[propKey] !== value) {
    (dom as any)[propKey] = value;
  }
}

function patchStyle(lastAttrValue: any, nextAttrValue: any, dom: HTMLElement): void {
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

  if (lastAttrValue != null && typeof lastAttrValue !== 'string') {
    for (style in nextAttrValue) {
      value = nextAttrValue[style];
      if (value !== lastAttrValue[style]) {
        domStyle.setProperty(style, value);
      }
    }

    for (style in lastAttrValue) {
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

function patchEvent(name: string, lastValue: any, nextValue: any, dom: HTMLElement): void {
  name = name.toLowerCase().substring(2);

  if (typeof lastValue === 'function') {
    dom.removeEventListener(name, lastValue);
  }

  if (typeof nextValue === 'function') {
    dom.addEventListener(name, nextValue);
  }
}
