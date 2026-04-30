import type { SimpElement, SimpRenderRuntime } from '@simpreact/internal';
import { withSyncRerender } from '@simpreact/internal';
import type { Dict } from '@simpreact/shared';

export function isCheckedType(type: string): boolean {
  return type === 'checkbox' || type === 'radio';
}

export function isEventNameIgnored(props: Dict, eventName: string): boolean {
  return isCheckedType(props.type as string) ? eventName === 'onChange' : eventName === 'onInput';
}

function createControlledInputInputHandler(renderRuntime: SimpRenderRuntime): (event: Event) => void {
  return event => {
    let element = renderRuntime.hostAdapter.getElementFromReference(event.target, renderRuntime);

    if (!element || !element.props) {
      return;
    }

    const onInput = element.props['onInput'];
    if (onInput) {
      withSyncRerender(renderRuntime, () => {
        onInput(event);
      });
      element = renderRuntime.hostAdapter.getElementFromReference(event.target, renderRuntime);
    }

    if (element) {
      syncControlledInputProps(element, element.props);
    }
  };
}

const controlledInputInputHandlersByRuntime = new WeakMap<SimpRenderRuntime, (event: Event) => void>();

function getControlledInputInputHandler(renderRuntime: SimpRenderRuntime): (event: Event) => void {
  let handler = controlledInputInputHandlersByRuntime.get(renderRuntime);
  if (!handler) {
    handler = createControlledInputInputHandler(renderRuntime);
    controlledInputInputHandlersByRuntime.set(renderRuntime, handler);
  }
  return handler;
}

function createControlledInputChangeHandler(renderRuntime: SimpRenderRuntime): (event: Event) => void {
  return event => {
    let element = renderRuntime.hostAdapter.getElementFromReference(event.target, renderRuntime);

    if (!element || !element.props) {
      return;
    }

    const onChange = element.props['onChange'];
    if (onChange) {
      withSyncRerender(renderRuntime, () => {
        onChange(event);
      });
      element = renderRuntime.hostAdapter.getElementFromReference(event.target, renderRuntime);
    }

    if (element) {
      syncControlledInputProps(element, element.props);
    }
  };
}

const controlledInputChangeHandlersByRuntime = new WeakMap<SimpRenderRuntime, (event: Event) => void>();

function getControlledInputChangeHandler(renderRuntime: SimpRenderRuntime): (event: Event) => void {
  let handler = controlledInputChangeHandlersByRuntime.get(renderRuntime);
  if (!handler) {
    handler = createControlledInputChangeHandler(renderRuntime);
    controlledInputChangeHandlersByRuntime.set(renderRuntime, handler);
  }
  return handler;
}

export function addControlledInputEventHandlers(dom: HTMLInputElement, renderRuntime: SimpRenderRuntime): void {
  if (isCheckedType(dom.type)) {
    dom.addEventListener('change', getControlledInputChangeHandler(renderRuntime));
  } else {
    dom.addEventListener('input', getControlledInputInputHandler(renderRuntime));
  }
}

export function removeControlledInputEventHandlers(dom: HTMLInputElement, renderRuntime: SimpRenderRuntime): void {
  if (isCheckedType(dom.type)) {
    dom.removeEventListener('change', getControlledInputChangeHandler(renderRuntime));
  } else {
    dom.removeEventListener('input', getControlledInputInputHandler(renderRuntime));
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
