import type { SimpElement } from '@simpreact/internal';
import { syncRerenderLocker } from '@simpreact/internal';
import type { Dict } from '@simpreact/shared';

import { getElementFromDom } from '../../attach-element-to-dom';

export function isEventNameIgnored(eventName: string): boolean {
  return eventName === 'onChange' || eventName === 'onInput';
}

function onControlledTextareaChange(event: Event): void {
  let element = getElementFromDom(event.target);

  if (!element || !element.props) {
    return;
  }

  if (element.props['onChange']) {
    syncRerenderLocker.lock();
    element.props['onChange'](event);
    syncRerenderLocker.flush();
    element = getElementFromDom(event.target);
  }

  if (element) {
    syncControlledTextareaProps(element, element.props);
  }
}

function onControlledTextareaInput(event: Event): void {
  let element = getElementFromDom(event.target);

  if (!element || !element.props) {
    return;
  }

  if (element.props['onInput']) {
    syncRerenderLocker.lock();
    element.props['onInput'](event);
    syncRerenderLocker.flush();
    element = getElementFromDom(event.target);
  }

  if (element) {
    syncControlledTextareaProps(element, element.props);
  }
}

export function addControlledTextareaEventHandlers(dom: HTMLTextAreaElement): void {
  dom.addEventListener('input', onControlledTextareaInput);
  dom.addEventListener('change', onControlledTextareaChange);
}

export function removeControlledTextareaEventHandlers(dom: HTMLTextAreaElement): void {
  dom.removeEventListener('input', onControlledTextareaInput);
  dom.removeEventListener('change', onControlledTextareaChange);
}

export function syncControlledTextareaProps(element: SimpElement, props: Dict, mounting = false): void {
  const dom = element.reference as HTMLTextAreaElement;
  const value = props.value;
  const domValue = dom.value;

  if (value == null) {
    if (mounting) {
      const defaultValue = props.defaultValue;

      if (defaultValue != null && defaultValue !== domValue) {
        dom.defaultValue = defaultValue;
        dom.value = defaultValue;
      }
    }
  } else if (domValue !== value) {
    dom.defaultValue = value;
    dom.value = value;
  }
}
