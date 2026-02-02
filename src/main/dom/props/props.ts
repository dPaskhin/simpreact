import type { SimpElement, SimpRenderRuntime } from '@simpreact/internal';
import { emptyObject, type Maybe } from '@simpreact/shared';
import { isPropNameEventName, patchEvent } from '../events.js';
import type { Namespace } from '../namespace.js';
import { defaultNamespace } from '../namespace.js';
import {
  addControlledFormElementEventHandlers,
  isEventNameIgnored,
  isFormElementControlled,
  removeControlledFormElementEventHandlers,
  syncControlledFormElementPropsWithAttrs,
} from './controlled/index.js';
import { patchDangerInnerHTML } from './dangerInnerHTML.js';
import { patchStyle } from './style.js';

export function mountProps(
  dom: HTMLElement | SVGElement,
  element: SimpElement,
  namespace: Namespace,
  renderRuntime: SimpRenderRuntime
): void {
  if (!isFormElement(element)) {
    for (const propName in element.props) {
      patchDefaultElementPropAndAttrs(
        propName,
        dom,
        null,
        element,
        null,
        element.props[propName],
        namespace,
        renderRuntime
      );
    }
    return;
  }

  const isControlled = isFormElementControlled(element.props);

  for (const propName in element.props) {
    patchFormElementsPropAndAttrs(propName, dom as HTMLElement, element, isControlled, null, element.props[propName]);
  }

  if (isControlled) {
    addControlledFormElementEventHandlers(element, renderRuntime);
    syncControlledFormElementPropsWithAttrs(element, element.props, true);
  }
}

export function unmountProps(dom: HTMLElement | SVGElement, element: SimpElement): void {
  if (!element.props) {
    return;
  }

  for (const propName in element.props) {
    if (isPropNameEventName(propName)) {
      patchEvent(propName, element.props[propName], null, dom);
    }
  }
}

export function patchProps(
  dom: HTMLElement | SVGElement,
  prevElement: SimpElement,
  nextElement: SimpElement,
  namespace: Namespace,
  renderRuntime: SimpRenderRuntime
): void {
  const prevProps = prevElement.props || emptyObject;
  const nextProps = nextElement.props || emptyObject;

  if (!isFormElement(nextElement)) {
    for (const propName in nextProps) {
      const prevValue = prevProps[propName];
      const nextValue = nextProps[propName];

      if (prevValue !== nextValue) {
        patchDefaultElementPropAndAttrs(
          propName,
          dom,
          prevElement,
          nextElement,
          prevValue,
          nextValue,
          namespace,
          renderRuntime
        );
      }
    }

    for (const propName in prevProps) {
      if (nextProps[propName] == null && prevProps[propName] != null) {
        patchDefaultElementPropAndAttrs(
          propName,
          dom,
          prevElement,
          nextElement,
          prevProps[propName],
          null,
          namespace,
          renderRuntime
        );
      }
    }

    return;
  }

  const isPrevElementControlled = isFormElementControlled(prevProps);
  const isNextElementControlled = isFormElementControlled(nextProps);

  for (const propName in nextProps) {
    const prevValue = prevProps[propName];
    const nextValue = nextProps[propName];

    if (prevValue !== nextValue) {
      patchFormElementsPropAndAttrs(
        propName,
        dom as HTMLElement,
        nextElement,
        isNextElementControlled,
        prevValue,
        nextValue
      );
    }
  }

  for (const propName in prevProps) {
    if (nextProps[propName] == null && prevProps[propName] != null) {
      patchFormElementsPropAndAttrs(
        propName,
        dom as HTMLElement,
        prevElement,
        isPrevElementControlled,
        prevProps[propName],
        null
      );
    }
  }

  if (!isPrevElementControlled && isNextElementControlled) {
    addControlledFormElementEventHandlers(nextElement, renderRuntime);
  } else if (isPrevElementControlled && !isNextElementControlled) {
    removeControlledFormElementEventHandlers(prevElement, renderRuntime);
  }
  if (isNextElementControlled) {
    syncControlledFormElementPropsWithAttrs(nextElement, nextProps);
  }
}

function patchFormElementsPropAndAttrs(
  propName: string,
  dom: HTMLElement,
  element: SimpElement,
  isControlled: boolean,
  prevValue: any,
  nextValue: any
): void {
  switch (propName) {
    case 'children':
    case 'className':
    case 'key':
    case 'ref':
      break;

    case 'value':
      if (!isControlled) {
        patchDomProp(nextValue, dom, propName);
      }
      break;

    case 'defaultValue':
    case 'selectedIndex':
      if (!isControlled) {
        patchDomProp(nextValue, dom, propName);
      }
      break;

    case 'multiple':
    case 'defaultChecked':
    case 'checked':
      if (!isControlled) {
        (dom as any)[propName] = !!nextValue;
      }
      break;

    case 'capture':
    case 'indeterminate':
    case 'readOnly':
    case 'required':
      (dom as any)[propName] = !!nextValue;
      break;

    case 'style':
      patchStyle(prevValue, nextValue, dom);
      break;

    default:
      if (isPropNameEventName(propName)) {
        if (isControlled && isEventNameIgnored(element, propName)) {
          patchEvent(propName, prevValue, null, dom);
          break;
        }

        patchEvent(propName, prevValue, nextValue, dom);
      } else {
        patchDomAttr(dom, nextValue, propName);
      }
  }
}

function patchDefaultElementPropAndAttrs(
  propName: string,
  dom: HTMLElement | SVGElement,
  prevElement: Maybe<SimpElement>,
  nextElement: SimpElement,
  prevValue: any,
  nextValue: any,
  namespace: Namespace,
  renderRuntime: SimpRenderRuntime
): void {
  switch (propName) {
    case 'children':
    case 'className':
    case 'key':
    case 'ref':
      break;

    case 'autoFocus':
      (dom as any).autofocus = !!nextValue;
      break;

    case 'allowfullscreen':
    case 'autoplay':
    case 'controls':
    case 'default':
    case 'disabled':
    case 'hidden':
    case 'loop':
    case 'muted':
    case 'novalidate':
    case 'open':
    case 'reversed':
    case 'selected':
      (dom as any)[propName] = !!nextValue;
      break;

    case 'volume':
      patchDomProp(nextValue, dom, propName);
      break;

    case 'style':
      patchStyle(prevValue, nextValue, dom);
      break;

    case 'dangerouslySetInnerHTML':
      patchDangerInnerHTML(prevValue, nextValue, prevElement, nextElement, dom, renderRuntime);
      break;

    default:
      if (isPropNameEventName(propName)) {
        patchEvent(propName, prevValue, nextValue, dom);
      } else {
        patchDomAttr(dom, nextValue, propName, namespace);
      }
  }
}

function patchDomProp(nextValue: unknown, dom: HTMLElement | SVGElement, propKey: string): void {
  const value = nextValue == null ? '' : nextValue;
  if ((dom as any)[propKey] !== value) {
    (dom as any)[propKey] = value;
  }
}

function patchDomAttr(dom: HTMLElement | SVGElement, value: any, propName: string, namespace = defaultNamespace): void {
  if (value == null) {
    dom.removeAttribute(propName);
  } else {
    if (namespace === 'http://www.w3.org/2000/svg' && svgAttrsNamespaces[propName]) {
      dom.setAttributeNS(svgAttrsNamespaces[propName], propName, value);
    } else {
      dom.setAttribute(propName, value);
    }
  }
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

function isFormElement(element: SimpElement): boolean {
  return element.type === 'input' || element.type === 'textarea' || element.type === 'select';
}
