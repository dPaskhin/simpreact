import type { SimpElement, SimpRenderRuntime } from '@simpreact/internal';
import { withSyncRerender } from '@simpreact/internal';
import type { Dict } from '@simpreact/shared';

export function isEventNameIgnored(eventName: string): boolean {
  return eventName === 'onChange' || eventName === 'onInput';
}

function createControlledTextareaChangeHandler(renderRuntime: SimpRenderRuntime): (event: Event) => void {
  return (event: Event) => {
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
      syncControlledTextareaProps(element, element.props);
    }
  };
}

const controlledTextareaChangeHandlersByRuntime = new WeakMap<SimpRenderRuntime, (event: Event) => void>();

function getControlledTextareaChangeHandler(renderRuntime: SimpRenderRuntime): (event: Event) => void {
  let handler = controlledTextareaChangeHandlersByRuntime.get(renderRuntime);
  if (!handler) {
    handler = createControlledTextareaChangeHandler(renderRuntime);
    controlledTextareaChangeHandlersByRuntime.set(renderRuntime, handler);
  }
  return handler;
}

function createControlledTextareaInputHandler(renderRuntime: SimpRenderRuntime): (event: Event) => void {
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
      syncControlledTextareaProps(element, element.props);
    }
  };
}

const controlledTextareaInputHandlersByRuntime = new WeakMap<SimpRenderRuntime, (event: Event) => void>();

function getControlledTextareaInputHandler(renderRuntime: SimpRenderRuntime): (event: Event) => void {
  let handler = controlledTextareaInputHandlersByRuntime.get(renderRuntime);
  if (!handler) {
    handler = createControlledTextareaInputHandler(renderRuntime);
    controlledTextareaInputHandlersByRuntime.set(renderRuntime, handler);
  }
  return handler;
}

export function addControlledTextareaEventHandlers(dom: HTMLTextAreaElement, renderRuntime: SimpRenderRuntime): void {
  dom.addEventListener('input', getControlledTextareaInputHandler(renderRuntime));
  dom.addEventListener('change', getControlledTextareaChangeHandler(renderRuntime));
}

export function removeControlledTextareaEventHandlers(
  dom: HTMLTextAreaElement,
  renderRuntime: SimpRenderRuntime
): void {
  dom.removeEventListener('input', getControlledTextareaInputHandler(renderRuntime));
  dom.removeEventListener('change', getControlledTextareaChangeHandler(renderRuntime));
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
