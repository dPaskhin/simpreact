import type { SimpElement } from '@simpreact/internal';
import { syncRerenderLocker } from '@simpreact/internal';
import type { Dict, Many, Maybe } from '@simpreact/shared';
import { emptyObject } from '@simpreact/shared';

import { getElementFromDom } from '../../attach-element-to-dom';

export function isEventNameIgnored(eventName: string): boolean {
  return eventName === 'onChange';
}

function onControlledInputChange(event: Event): void {
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
    syncControlledSelectProps(element, element.props);
  }
}

export function addControlledSelectEventHandlers(dom: HTMLSelectElement): void {
  dom.addEventListener('change', onControlledInputChange);
}

export function removeControlledSelectEventHandlers(dom: HTMLSelectElement): void {
  dom.removeEventListener('change', onControlledInputChange);
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

  const children = element.children as Maybe<Many<SimpElement>>;

  if (Array.isArray(children)) {
    for (let i = 0, len = children.length; i < len; ++i) {
      updateOptions(children[i]!, value);
    }
  } else if (children) {
    updateOptions(children, value);
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
