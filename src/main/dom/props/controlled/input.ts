import type { SimpElement, SimpRenderRuntime } from '@simpreact/internal';
import { flushSyncRerender, lockSyncRendering } from '@simpreact/internal';
import type { Dict } from '@simpreact/shared';

import { getElementFromDom } from '../../attach-element-to-dom.js';

export function isCheckedType(type: string): boolean {
  return type === 'checkbox' || type === 'radio';
}

export function isEventNameIgnored(props: Dict, eventName: string): boolean {
  return isCheckedType(props.type as string) ? eventName === 'onChange' : eventName === 'onInput';
}

function createControlledInputInputHandler(renderRuntime: SimpRenderRuntime): (event: Event) => void {
  return event => {
    let element = getElementFromDom(event.target);

    if (!element || !element.props) {
      return;
    }

    if (element.props['onInput']) {
      lockSyncRendering();
    }
    element.props['onInput'](event);
    flushSyncRerender(renderRuntime);
    element = getElementFromDom(event.target);

    if (element) {
      syncControlledInputProps(element, element.props);
    }
  };
}

function createControlledInputChangeHandler(renderRuntime: SimpRenderRuntime): (event: Event) => void {
  return event => {
    let element = getElementFromDom(event.target);

    if (!element || !element.props) {
      return;
    }

    if (element.props['onChange']) {
      lockSyncRendering();
      element.props['onChange'](event);
      flushSyncRerender(renderRuntime);
      element = getElementFromDom(event.target);
    }

    if (element) {
      syncControlledInputProps(element, element.props);
    }
  };
}

export function addControlledInputEventHandlers(dom: HTMLInputElement, renderRuntime: SimpRenderRuntime): void {
  if (isCheckedType(dom.type)) {
    dom.addEventListener('change', createControlledInputChangeHandler(renderRuntime));
  } else {
    dom.addEventListener('input', createControlledInputInputHandler(renderRuntime));
  }
}

export function removeControlledInputEventHandlers(dom: HTMLInputElement, renderRuntime: SimpRenderRuntime): void {
  if (isCheckedType(dom.type)) {
    dom.removeEventListener('change', createControlledInputChangeHandler(renderRuntime));
  } else {
    dom.removeEventListener('input', createControlledInputInputHandler(renderRuntime));
  }
}

export function syncControlledInputProps(element: SimpElement, props: Dict): void {
  const { type, value, checked, multiple, defaultValue } = props;
  const dom = element.reference as HTMLInputElement;
  const hasValue = value != null;
  const hasChecked = checked != null;

  if (type != null && type !== dom.type) {
    dom.setAttribute('type', type);
  }
  if (multiple != null && multiple !== dom.multiple) {
    dom.multiple = multiple;
  }
  if (defaultValue != null && !hasValue) {
    dom.defaultValue = defaultValue + '';
  }
  if (isCheckedType(type)) {
    if (hasChecked) {
      dom.checked = checked;
    }
  } else {
    if (hasValue && dom.value !== value) {
      dom.defaultValue = value;
      dom.value = value;
    }
  }
}
