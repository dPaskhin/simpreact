import type { Dict, Maybe } from '@simpreact/shared';
import type { HostAdapter, SimpElement } from '@simpreact/internal';
import { unmount, unmountAllChildren } from '@simpreact/internal';

import { isPropNameEventName, patchEvent } from './events';
import { attachElementToDom } from './attach-element-to-dom';

export const domAdapter: HostAdapter<HTMLElement, Text> = {
  createReference(type) {
    return document.createElement(type);
  },
  createTextReference(text) {
    return document.createTextNode(text);
  },

  mountProps(reference, props, prevElement, nextElement) {
    mountProps(props, reference, prevElement, nextElement);
  },

  patchProp(reference, prevElement, nextElement, propName, prevValue, nextValue) {
    patchProp(propName, reference, prevElement, nextElement, prevValue, nextValue);
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

  replaceChild(parent, replacer, toBeReplaced) {
    parent.replaceChild(replacer, toBeReplaced);
  },

  findParentReference(reference) {
    return reference.parentElement as HTMLElement;
  },

  clearNode(reference) {
    reference.textContent = '';
  },

  attachElementToReference(element, reference) {
    attachElementToDom(element, reference);
  },
};

function mountProps(
  props: Dict,
  reference: HTMLElement,
  prevElement: Maybe<SimpElement>,
  nextElement: Maybe<SimpElement>
): void {
  for (const propName in props) {
    patchProp(propName, reference, prevElement, nextElement, null, props[propName]);
  }
}

function patchProp(
  propName: string,
  dom: HTMLElement,
  prevElement: Maybe<SimpElement>,
  nextElement: Maybe<SimpElement>,
  prevValue: any,
  nextValue: any
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
        dom.setAttribute(propName, nextValue);
      }
  }
}

function patchDomProp(nextValue: unknown, dom: HTMLElement, propKey: string): void {
  const value = nextValue == null ? '' : nextValue;
  if ((dom as any)[propKey] !== value) {
    (dom as any)[propKey] = value;
  }
}

function patchStyle(prevAttrValue: any, nextAttrValue: any, dom: HTMLElement): void {
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
