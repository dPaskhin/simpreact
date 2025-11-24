import type { SimpElement } from '@simpreact/internal';
import { SimpElementFlag } from '@simpreact/internal';
import type { Nullable } from '@simpreact/shared';

import { getElementFromDom } from './attach-element-to-dom.js';

type DelegatedEventType =
  | 'click'
  | 'dblclick'
  | 'mousedown'
  | 'mouseup'
  | 'mousemove'
  | 'pointerdown'
  | 'pointerup'
  | 'pointermove'
  | 'touchstart'
  | 'touchmove'
  | 'touchend'
  | 'keydown'
  | 'keyup'
  | 'focusin'
  | 'focusout';

const eventNameByTypes: Record<DelegatedEventType, string> = {
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

const delegatedEventTypes = new Set(Object.keys(eventNameByTypes));

const eventHandlerCounts: Record<DelegatedEventType, number> = {
  click: 0,
  dblclick: 0,
  mousedown: 0,
  mouseup: 0,
  mousemove: 0,
  pointerdown: 0,
  pointerup: 0,
  pointermove: 0,
  touchstart: 0,
  touchmove: 0,
  touchend: 0,
  keydown: 0,
  keyup: 0,
  focusin: 0,
  focusout: 0,
};

export class SyntheticEvent {
  nativeEvent: Event;
  currentTarget: Nullable<EventTarget> = null;
  isPropagationStopped = false;
  _isDefaultPrevented = false;

  button?: number;
  buttons?: number;
  pointerId?: number;

  altKey?: boolean;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;

  constructor(event: Event) {
    this.nativeEvent = event;
    this.button = (event as PointerEvent).button;
    this.buttons = (event as PointerEvent).buttons;
    this.pointerId = (event as PointerEvent).pointerId;
    this.altKey = (event as PointerEvent).altKey;
    this.ctrlKey = (event as PointerEvent).ctrlKey;
    this.metaKey = (event as PointerEvent).metaKey;
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
    this._isDefaultPrevented = true;
    this.nativeEvent.preventDefault();
  }

  isDefaultPrevented(): boolean {
    return this._isDefaultPrevented;
  }
}

export function dispatchDelegatedEvent(event: Event): void {
  const syntheticEvent = new SyntheticEvent(event);

  const captureHandlers: Array<{
    element: SimpElement;
    handler: (event: SyntheticEvent) => void;
  }> = [];
  const bubbleHandlers: Array<{
    element: SimpElement;
    handler: (event: SyntheticEvent) => void;
  }> = [];

  let element: Nullable<SimpElement> = getElementFromDom(event.target);

  while (element) {
    if (element.flag === SimpElementFlag.HOST) {
      const captureHandler = element.props?.[eventNameByTypes[event.type as DelegatedEventType] + 'Capture'];
      const bubbleHandler = element.props?.[eventNameByTypes[event.type as DelegatedEventType]];
      if (captureHandler) {
        captureHandlers.push({ element, handler: captureHandler });
      }
      if (bubbleHandler) {
        bubbleHandlers.push({ element, handler: bubbleHandler });
      }
    }
    element = element.parent;
  }

  for (const { handler, element } of captureHandlers.reverse()) {
    syntheticEvent.currentTarget = element.reference as unknown as EventTarget;
    handler(syntheticEvent);
    if (syntheticEvent.isPropagationStopped) {
      return;
    }
  }
  for (const { element, handler } of bubbleHandlers) {
    syntheticEvent.currentTarget = element.reference as unknown as EventTarget;
    handler(syntheticEvent);
    if (syntheticEvent.isPropagationStopped) {
      return;
    }
  }
}

const captureRegex = /Capture/;

export function patchEvent(name: string, prevValue: any, nextValue: any, dom: Element): void {
  const isCapture = captureRegex.test(name);

  name = name.replace(captureRegex, '').substring(2).toLowerCase();

  if (delegatedEventTypes.has(name)) {
    patchDelegatedEvent(name as DelegatedEventType, nextValue, eventHandlerCounts);
  } else {
    patchNormalEvent(name, prevValue, nextValue, dom, isCapture);
  }
}

export function patchDelegatedEvent(
  eventType: DelegatedEventType,
  handler: any,
  eventHandlerCounts: Record<DelegatedEventType, number>
): void {
  if (typeof handler === 'function') {
    if (++eventHandlerCounts[eventType]! === 1) {
      document.addEventListener(eventType, dispatchDelegatedEvent);
    }
  } else {
    if (eventHandlerCounts[eventType] !== 0 && --eventHandlerCounts[eventType]! === 0) {
      document.removeEventListener(eventType, dispatchDelegatedEvent);
    }
  }
}

export function patchNormalEvent(
  eventType: string,
  prevValue: any,
  nextValue: any,
  dom: Element,
  capture: boolean
): void {
  if (typeof prevValue === 'function') {
    dom.removeEventListener(eventType, prevValue, { capture });
  }

  if (typeof nextValue === 'function') {
    dom.addEventListener(eventType, nextValue, { capture });
  }
}

export function isPropNameEventName(name: string): boolean {
  return name.charCodeAt(0) === 111 && name.charCodeAt(1) === 110;
}
