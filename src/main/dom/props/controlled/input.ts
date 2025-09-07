import type { SimpElement } from '@simpreact/internal';
import { batchingRerenderLocker } from '@simpreact/internal';
import type { Dict } from '@simpreact/shared';

import { getElementFromDom } from '../../attach-element-to-dom.js';

export function isCheckedType(type: string): boolean {
  return type === 'checkbox' || type === 'radio';
}

export function isEventNameIgnored(props: Dict, eventName: string): boolean {
  return isCheckedType(props.type as string) ? eventName === 'onChange' : eventName === 'onInput';
}

function onControlledInputInput(event: Event): void {
  let element = getElementFromDom(event.target);

  if (!element || !element.props) {
    return;
  }

  if (element.props['onInput']) {
    batchingRerenderLocker.lock();
    element.props['onInput'](event);
    batchingRerenderLocker.flush();
    element = getElementFromDom(event.target);
  }

  if (element) {
    syncControlledInputProps(element, element.props);
  }
}

function onControlledInputChange(event: Event): void {
  let element = getElementFromDom(event.target);

  if (!element || !element.props) {
    return;
  }

  if (element.props['onChange']) {
    batchingRerenderLocker.lock();
    element.props['onChange'](event);
    batchingRerenderLocker.flush();
    element = getElementFromDom(event.target);
  }

  if (element) {
    syncControlledInputProps(element, element.props);
  }
}

export function addControlledInputEventHandlers(dom: HTMLInputElement): void {
  if (isCheckedType(dom.type)) {
    dom.addEventListener('change', onControlledInputChange);
  } else {
    dom.addEventListener('input', onControlledInputInput);
  }
}

export function removeControlledInputEventHandlers(dom: HTMLInputElement): void {
  if (isCheckedType(dom.type)) {
    dom.removeEventListener('change', onControlledInputChange);
  } else {
    dom.removeEventListener('input', onControlledInputInput);
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
