import type { Dict, Nullable } from '@simpreact/shared';
import type { SimpElement } from '@simpreact/internal';

import { getElementFromEventTarget } from './attach-element-to-dom';

const eventNameByTypes: Dict<string> = {
  click: 'onClick',
  dblclick: 'onDblClick',
  mousedown: 'onMouseDown',
  mouseup: 'onMouseUp',
  mousemove: 'onMouseMove',
  pointerdown: 'onPointerDown',
  pointerup: 'onPointerUp',
  pointermove: 'onPointerMove',
  touchstart: 'onTouchStart',
  touchmove: 'onTouchMove',
  touchend: 'onTouchEnd',
  keydown: 'onKeyDown',
  keyup: 'onKeyUp',
  focusin: 'onFocusIn',
  focusout: 'onFocusOut',
};

const eventTypeByNames: Dict<string> = {
  onClick: 'click',
  onDblClick: 'dblclick',
  onMouseDown: 'mousedown',
  onMouseUp: 'mouseup',
  onMouseMove: 'mousemove',
  onPointerDown: 'pointerdown',
  onPointerUp: 'pointerup',
  onPointerMove: 'pointermove',
  onTouchStart: 'touchstart',
  onTouchMove: 'touchmove',
  onTouchEnd: 'touchend',
  onKeyDown: 'keydown',
  onKeyUp: 'keyup',
  onFocusIn: 'focusin',
  onFocusOut: 'focusout',
};

const delegatedEventNames = new Set(Object.keys(eventTypeByNames));

type EventPhase = 'capture' | 'bubble';

type EventHandlerCounts = Dict<Record<EventPhase, number>>;

const eventHandlerCounts: EventHandlerCounts = {
  onClick: { capture: 0, bubble: 0 },
  onDblClick: { capture: 0, bubble: 0 },
  onMouseDown: { capture: 0, bubble: 0 },
  onMouseUp: { capture: 0, bubble: 0 },
  onMouseMove: { capture: 0, bubble: 0 },
  onPointerDown: { capture: 0, bubble: 0 },
  onPointerUp: { capture: 0, bubble: 0 },
  onPointerMove: { capture: 0, bubble: 0 },
  onTouchStart: { capture: 0, bubble: 0 },
  onTouchMove: { capture: 0, bubble: 0 },
  onTouchEnd: { capture: 0, bubble: 0 },
  onKeyDown: { capture: 0, bubble: 0 },
  onKeyUp: { capture: 0, bubble: 0 },
  onFocusIn: { capture: 0, bubble: 0 },
  onFocusOut: { capture: 0, bubble: 0 },
};

export class SyntheticEvent {
  nativeEvent: Event;
  currentTarget: Nullable<EventTarget> = null;
  isPropagationStopped = false;
  isDefaultPrevented = false;

  constructor(event: Event) {
    this.nativeEvent = event;
  }

  get target() {
    return this.nativeEvent.target;
  }

  get type() {
    return this.nativeEvent.type;
  }

  stopPropagation() {
    this.isPropagationStopped = true;
    this.nativeEvent.stopPropagation();
  }

  preventDefault() {
    this.isDefaultPrevented = true;
    this.nativeEvent.preventDefault();
  }
}

export function handleDelegatedCaptureEvent(event: Event): void {
  const syntheticEvent = new SyntheticEvent(event);
  const captureHandlers: Array<{ element: SimpElement; handler: (event: SyntheticEvent) => void }> = [];

  let element: Nullable<SimpElement> = getElementFromEventTarget(event.target);

  while (element) {
    if (element.flag === 'HOST') {
      const handler = element.props?.[eventNameByTypes[event.type]! + 'Capture'];
      if (handler) {
        captureHandlers.push({ element, handler });
      }
    }
    element = element.parent;
  }

  for (const captureHandler of captureHandlers.reverse()) {
    syntheticEvent.currentTarget = captureHandler.element.reference as unknown as EventTarget;
    captureHandler.handler(syntheticEvent);
    if (syntheticEvent.isPropagationStopped) {
      return;
    }
  }
}

export function handleDelegatedEvent(event: Event): void {
  const syntheticEvent = new SyntheticEvent(event);
  let element: Nullable<SimpElement> = getElementFromEventTarget(event.target);

  while (element) {
    if (element.flag === 'HOST') {
      const handler = element.props?.[eventNameByTypes[event.type]!];
      if (handler) {
        syntheticEvent.currentTarget = element.reference as unknown as EventTarget;
        handler(syntheticEvent);
        if (syntheticEvent.isPropagationStopped) {
          return;
        }
      }
    }
    element = element.parent;
  }
}

export function patchEvent(name: string, prevValue: any, nextValue: any, dom: HTMLElement): void {
  if (delegatedEventNames.has(name)) {
    patchDelegatedEvent(name, nextValue, eventHandlerCounts);
  } else {
    patchNormalEvent(name, prevValue, nextValue, dom);
  }
}

const captureRegex = /Capture/;

export function patchDelegatedEvent(name: string, handler: any, eventHandlerCounts: EventHandlerCounts): void {
  const phase: EventPhase = captureRegex.test(name) ? 'capture' : 'bubble';

  name = phase === 'capture' ? name.replace(captureRegex, '') : name;

  if (typeof handler === 'function') {
    if (++eventHandlerCounts[name]![phase] === 1) {
      document.addEventListener(
        eventTypeByNames[name]!,
        phase === 'capture' ? handleDelegatedCaptureEvent : handleDelegatedEvent
      );
    }
  } else {
    if (eventHandlerCounts[name]![phase] !== 0 && --eventHandlerCounts[name]![phase] === 0) {
      document.removeEventListener(
        eventTypeByNames[name]!,
        phase === 'capture' ? handleDelegatedCaptureEvent : handleDelegatedEvent
      );
    }
  }
}

export function patchNormalEvent(name: string, prevValue: any, nextValue: any, dom: HTMLElement): void {
  name = name.toLowerCase().substring(2);

  if (typeof prevValue === 'function') {
    dom.removeEventListener(name, prevValue);
  }

  if (typeof nextValue === 'function') {
    dom.addEventListener(name, nextValue);
  }
}

export function isPropNameEventName(name: string): boolean {
  return name.charCodeAt(0) === 111 && name.charCodeAt(1) === 110;
}
