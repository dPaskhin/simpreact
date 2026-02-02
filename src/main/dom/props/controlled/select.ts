import type { SimpElement, SimpRenderRuntime } from '@simpreact/internal';
import {
  flushSyncRerender,
  lockSyncRendering,
  SIMP_ELEMENT_CHILD_FLAG_ELEMENT,
  SIMP_ELEMENT_CHILD_FLAG_LIST,
} from '@simpreact/internal';
import type { Dict } from '@simpreact/shared';
import { emptyObject } from '@simpreact/shared';

import { getElementFromDom } from '../../attach-element-to-dom.js';

export function isEventNameIgnored(eventName: string): boolean {
  return eventName === 'onChange';
}

function createControlledInputChangeHandler(renderRuntime: SimpRenderRuntime): (event: Event) => void {
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
      syncControlledSelectProps(element, element.props);
    }
  };
}

export function addControlledSelectEventHandlers(dom: HTMLSelectElement, renderRuntime: SimpRenderRuntime): void {
  dom.addEventListener('change', createControlledInputChangeHandler(renderRuntime));
}

export function removeControlledSelectEventHandlers(dom: HTMLSelectElement, renderRuntime: SimpRenderRuntime): void {
  dom.removeEventListener('change', createControlledInputChangeHandler(renderRuntime));
}

export function syncControlledSelectProps(element: SimpElement, props: Dict, mounting = false): void {
  const multiple = Boolean(props.multiple);
  const dom = element.reference as HTMLSelectElement;

  if (props.multiple != null && multiple !== dom.multiple) {
    dom.multiple = multiple;
  }
  const index = props.selectedIndex;
  if (index === -1) {
    dom.selectedIndex = -1;
  }

  let value = props.value;
  if (typeof index === 'number' && index > -1 && dom.options[index] != null) {
    value = dom.options[index].value;
  }

  if (mounting && value == null) {
    value = props.defaultValue;
  }

  updateOptions(element, value);
}

function updateOptions(element: SimpElement, value: unknown): void {
  if (element.type === 'option') {
    updateOption(element, value);
    return;
  }

  const children = element.children;
  const childFlag = element.childFlag;

  switch (childFlag) {
    case SIMP_ELEMENT_CHILD_FLAG_LIST:
      for (let i = 0, len = (children as SimpElement[]).length; i < len; ++i) {
        updateOptions((children as SimpElement[])[i]!, value);
      }
      break;
    case SIMP_ELEMENT_CHILD_FLAG_ELEMENT:
      updateOptions(children as SimpElement, value);
  }
}

function updateOption(element: SimpElement, value: unknown): void {
  const props = element.props || emptyObject;
  const propsValue = props.value;
  const dom = element.reference as HTMLOptionElement | undefined;

  if (!dom) {
    return;
  }

  dom.value = propsValue;

  if (propsValue === value || (Array.isArray(value) && value.includes(propsValue))) {
    dom.selected = true;
  } else if (value != null || props.selected != null) {
    dom.selected = Boolean(props.selected);
  }
}
