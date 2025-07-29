import type { SimpElement } from '@simpreact/internal';
import type { Dict } from '@simpreact/shared';

import {
  addControlledInputEventHandlers,
  isEventNameIgnored as isEventNameIgnoredInput,
  removeControlledInputEventHandlers,
  syncControlledInputProps,
} from './input';
import {
  addControlledSelectEventHandlers,
  isEventNameIgnored as isEventNameIgnoredSelect,
  removeControlledSelectEventHandlers,
  syncControlledSelectProps,
} from './select';
import {
  addControlledTextareaEventHandlers,
  isEventNameIgnored as isEventNameIgnoredTextarea,
  removeControlledTextareaEventHandlers,
  syncControlledTextareaProps,
} from './textarea';

export function isEventNameIgnored(element: SimpElement, eventName: string): boolean {
  if (element.type === 'input') {
    return isEventNameIgnoredInput(element.props, eventName);
  } else if (element.type === 'select') {
    return isEventNameIgnoredSelect(eventName);
  } else if (element.type === 'textarea') {
    return isEventNameIgnoredTextarea(eventName);
  }
  return false;
}

export function isFormElementControlled(props: Dict): boolean {
  return props.value != null || props.checked != null;
}

export function addControlledFormElementEventHandlers(element: SimpElement): void {
  if (element.type === 'input') {
    addControlledInputEventHandlers(element.reference);
  } else if (element.type === 'select') {
    addControlledSelectEventHandlers(element.reference);
  } else if (element.type === 'textarea') {
    addControlledTextareaEventHandlers(element.reference);
  }
}

export function removeControlledFormElementEventHandlers(element: SimpElement): void {
  if (element.type === 'input') {
    removeControlledInputEventHandlers(element.reference);
  } else if (element.type === 'select') {
    removeControlledSelectEventHandlers(element.reference);
  } else if (element.type === 'textarea') {
    removeControlledTextareaEventHandlers(element.reference);
  }
}

export function syncControlledFormElementPropsWithAttrs(element: SimpElement, props: Dict, mounting = false): void {
  if (element.type === 'input') {
    syncControlledInputProps(element, props);
  } else if (element.type === 'select') {
    syncControlledSelectProps(element, props, mounting);
  } else if (element.type === 'textarea') {
    syncControlledTextareaProps(element, props, mounting);
  }
}
