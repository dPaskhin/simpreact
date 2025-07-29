import type { SimpElement } from '@simpreact/internal';
import { emptyObject, type Maybe } from '@simpreact/shared';

import type { Namespace } from '../namespace';
import { defaultNamespace } from '../namespace';
import {
  addControlledFormElementEventHandlers,
  isEventNameIgnored,
  isFormElementControlled,
  removeControlledFormElementEventHandlers,
  syncControlledFormElementPropsWithAttrs,
} from './controlled';
import { isPropNameEventName, patchEvent } from '../events';
import { patchStyle } from './style';
import { patchDangerInnerHTML } from './dangerInnerHTML';

export function mountProps(dom: HTMLElement | SVGElement, element: SimpElement, namespace: Namespace): void {
  if (!isFormElement(element)) {
    for (const propName in element.props) {
      patchDefaultElementPropAndAttrs(propName, dom, null, element, null, element.props[propName], namespace);
    }
    return;
  }

  const isControlled = isFormElementControlled(element.props);

  for (const propName in element.props) {
    patchFormElementsPropAndAttrs(propName, dom as HTMLElement, element, isControlled, null, element.props[propName]);
  }

  if (isControlled) {
    addControlledFormElementEventHandlers(element);
    syncControlledFormElementPropsWithAttrs(element, element.props, true);
  }
}

export function patchProps(
  dom: HTMLElement | SVGElement,
  prevElement: SimpElement,
  nextElement: SimpElement,
  namespace: Namespace
): void {
  const prevProps = prevElement.props || emptyObject;
  const nextProps = nextElement.props || emptyObject;

  if (!isFormElement(nextElement)) {
    for (const propName in nextProps) {
      const prevValue = prevProps[propName];
      const nextValue = nextProps[propName];

      if (prevValue !== nextValue) {
        patchDefaultElementPropAndAttrs(propName, dom, prevElement, nextElement, prevValue, nextValue, namespace);
      }
    }

    for (const propName in prevProps) {
      if (nextProps[propName] == null && prevProps[propName] != null) {
        patchDefaultElementPropAndAttrs(propName, dom, prevElement, nextElement, prevProps[propName], null, namespace);
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
    addControlledFormElementEventHandlers(nextElement);
  } else if (isPrevElementControlled && !isNextElementControlled) {
    removeControlledFormElementEventHandlers(prevElement);
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
  namespace: Namespace
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
      patchDangerInnerHTML(prevValue, nextValue, prevElement, nextElement, dom);
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
