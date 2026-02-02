import type { SimpElement, SimpRenderRuntime } from '@simpreact/internal';
import { flushSyncRerender, lockSyncRendering } from '@simpreact/internal';
import type { Dict } from '@simpreact/shared';

import { getElementFromDom } from '../../attach-element-to-dom.js';

export function isEventNameIgnored(eventName: string): boolean {
  return eventName === 'onChange' || eventName === 'onInput';
}

function createControlledTextareaChangeHandler(renderRuntime: SimpRenderRuntime): (event: Event) => void {
  return (event: Event) => {
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
      syncControlledTextareaProps(element, element.props);
    }
  };
}

function createControlledTextareaInputHandler(renderRuntime: SimpRenderRuntime): (event: Event) => void {
  return event => {
    let element = getElementFromDom(event.target);

    if (!element || !element.props) {
      return;
    }

    if (element.props['onInput']) {
      lockSyncRendering();
      element.props['onInput'](event);
      flushSyncRerender(renderRuntime);
      element = getElementFromDom(event.target);
    }

    if (element) {
      syncControlledTextareaProps(element, element.props);
    }
  };
}

export function addControlledTextareaEventHandlers(dom: HTMLTextAreaElement, renderRuntime: SimpRenderRuntime): void {
  dom.addEventListener('input', createControlledTextareaInputHandler(renderRuntime));
  dom.addEventListener('change', createControlledTextareaChangeHandler(renderRuntime));
}

export function removeControlledTextareaEventHandlers(
  dom: HTMLTextAreaElement,
  renderRuntime: SimpRenderRuntime
): void {
  dom.removeEventListener('input', createControlledTextareaInputHandler(renderRuntime));
  dom.removeEventListener('change', createControlledTextareaChangeHandler(renderRuntime));
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
