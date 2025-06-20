import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Element } from 'flyweight-dom';

import {
  handleDelegatedCaptureEvent,
  handleDelegatedEvent,
  isPropNameEventName,
  patchDelegatedEvent,
  patchNormalEvent,
} from '../main/dom/events';
import { createElement, provideHostAdapter } from '../main/core/internal';
import { createRoot } from '../main/dom';
import { useEffect, useRef, useRerender } from '../main/hooks';
import { testHostAdapter } from './test-host-adapter';

provideHostAdapter(testHostAdapter);

describe('events', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('isPropNameEventName', () => {
    it('should return true for names starting with "on"', () => {
      expect(isPropNameEventName('onClick')).toBe(true);
      expect(isPropNameEventName('onInput')).toBe(true);
      expect(isPropNameEventName('onKeyDown')).toBe(true);
      expect(isPropNameEventName('onclick')).toBe(true);
      expect(isPropNameEventName('handleClick')).toBe(false);
      expect(isPropNameEventName('Click')).toBe(false);
      expect(isPropNameEventName('')).toBe(false);
      expect(isPropNameEventName('on')).toBe(true);
    });
  });

  describe('patchNormalEvent', () => {
    it('should add a new event listener if nextValue is a function', () => {
      const dom = document.createElement('div');
      const listener = vi.fn();

      patchNormalEvent('onScroll', null, listener, dom);
      dom.dispatchEvent(new Event('scroll'));

      expect(listener).toHaveBeenCalledOnce();
    });

    it('should remove previous event listener if prevValue is a function', () => {
      const dom = document.createElement('div');
      const listener = vi.fn();

      dom.addEventListener('scroll', listener);
      patchNormalEvent('onScroll', listener, null, dom);
      dom.dispatchEvent(new Event('scroll'));

      expect(listener).not.toHaveBeenCalled();
    });

    it('should replace an old listener with a new one', () => {
      const dom = document.createElement('div');
      const oldListener = vi.fn();
      const newListener = vi.fn();

      dom.addEventListener('scroll', oldListener);

      patchNormalEvent('onScroll', oldListener, newListener, dom);
      dom.dispatchEvent(new Event('scroll'));

      expect(oldListener).not.toHaveBeenCalled();
      expect(newListener).toHaveBeenCalledOnce();
    });
  });

  describe('patchDelegatedEvent (bubble phase)', () => {
    const eventType = 'click';
    const propName = 'onClick';
    const handler = vi.fn();

    const eventHandlerCounts = { onClick: { capture: 0, bubble: 0 } };

    beforeEach(() => {
      vi.spyOn(document, 'addEventListener');
      vi.spyOn(document, 'removeEventListener');
    });

    afterEach(() => {
      vi.restoreAllMocks();
      eventHandlerCounts.onClick.bubble = 0;
    });

    it('adds event listener for bubble phase if handler is provided', () => {
      patchDelegatedEvent(propName, handler, eventHandlerCounts);
      expect(document.addEventListener).toHaveBeenCalledWith(eventType, expect.any(Function));
    });

    it('does not add duplicate event listener if already added', () => {
      patchDelegatedEvent(propName, handler, eventHandlerCounts);
      patchDelegatedEvent(propName, handler, eventHandlerCounts);
      patchDelegatedEvent(propName, handler, eventHandlerCounts);
      patchDelegatedEvent(propName, handler, eventHandlerCounts);
      patchDelegatedEvent(propName, handler, eventHandlerCounts);
      expect(document.addEventListener).toHaveBeenCalledTimes(1);
      expect(eventHandlerCounts.onClick.bubble).toBe(5);
    });

    it('removes event listener when handler is removed and count reaches zero', () => {
      patchDelegatedEvent(propName, handler, eventHandlerCounts);
      patchDelegatedEvent(propName, null, eventHandlerCounts);
      expect(document.removeEventListener).toHaveBeenCalledWith(eventType, expect.any(Function));
    });

    it('does not throw if handler is null initially (no-op)', () => {
      expect(() => patchDelegatedEvent(propName, null, eventHandlerCounts)).not.toThrow();
      expect(eventHandlerCounts.onClick.bubble).toBe(0);
    });

    it('throws if eventHandlerCounts[name] is undefined', () => {
      expect(() => patchDelegatedEvent('onNonexistentEvent', handler, eventHandlerCounts)).toThrow();
    });
  });

  describe('patchDelegatedEvent (capture phase)', () => {
    const eventType = 'click';
    const propName = 'onClickCapture';
    const handler = vi.fn();

    const eventHandlerCounts = { onClick: { capture: 0, bubble: 0 } };

    beforeEach(() => {
      vi.spyOn(document, 'addEventListener');
      vi.spyOn(document, 'removeEventListener');
    });

    afterEach(() => {
      vi.restoreAllMocks();
      eventHandlerCounts.onClick.capture = 0;
    });

    it('adds event listener for capture phase if handler is provided', () => {
      patchDelegatedEvent(propName, handler, eventHandlerCounts);
      expect(document.addEventListener).toHaveBeenCalledWith(eventType, expect.any(Function));
    });

    it('does not add duplicate capture listeners if already added', () => {
      patchDelegatedEvent(propName, handler, eventHandlerCounts);
      patchDelegatedEvent(propName, handler, eventHandlerCounts);
      patchDelegatedEvent(propName, handler, eventHandlerCounts);
      expect(document.addEventListener).toHaveBeenCalledTimes(1);
      expect(eventHandlerCounts.onClick.capture).toBe(3);
    });

    it('removes event listener when handler is removed and count reaches zero', () => {
      patchDelegatedEvent(propName, handler, eventHandlerCounts);
      patchDelegatedEvent(propName, null, eventHandlerCounts);
      expect(document.removeEventListener).toHaveBeenCalledWith(eventType, expect.any(Function));
    });

    it('does not throw if capture handler is null initially (no-op)', () => {
      expect(() => patchDelegatedEvent(propName, null, eventHandlerCounts)).not.toThrow();
      expect(eventHandlerCounts.onClick.capture).toBe(0);
    });

    it('throws if capture eventHandlerCounts[name] is undefined', () => {
      expect(() => patchDelegatedEvent('onNonexistentCapture', handler, eventHandlerCounts)).toThrow();
    });
  });

  describe('handleDelegatedEvent', () => {
    const createEventWithTarget = (simpElement: any, type: string) => {
      const nativeEvent = new Event(type);
      Object.defineProperty(nativeEvent, 'target', { value: { __SIMP_ELEMENT__: simpElement }, writable: false });
      return nativeEvent;
    };

    it('calls handler on target element', () => {
      const handler = vi.fn();
      const simpElement = createElement('div', { onClick: handler });
      const event = createEventWithTarget(simpElement, 'click');

      handleDelegatedEvent(event);
      expect(handler).toHaveBeenCalledOnce();
    });

    it('bubbles to parent if no handler on target', () => {
      const parentHandler = vi.fn();
      const parent = createElement('div', { onClick: parentHandler });
      const child = createElement('child');
      child.parent = parent;
      const event = createEventWithTarget(child, 'click');

      handleDelegatedEvent(event);
      expect(parentHandler).toHaveBeenCalledOnce();
    });

    it('calls multiple handlers while bubbling up', () => {
      const rootHandler = vi.fn();
      const midHandler = vi.fn();
      const root = createElement('root', { onClick: rootHandler });
      const mid = createElement('mid', { onClick: midHandler });
      mid.parent = root;
      const leaf = createElement('leaf');
      leaf.parent = mid;
      const event = createEventWithTarget(leaf, 'click');

      handleDelegatedEvent(event);
      expect(midHandler).toHaveBeenCalledOnce();
      expect(rootHandler).toHaveBeenCalledOnce();
    });

    it('stops propagation when stopPropagation is called', () => {
      const rootHandler = vi.fn();
      const midHandler = vi.fn(e => e.stopPropagation());
      const root = createElement('root', { onClick: rootHandler });
      const mid = createElement('mid', { onClick: midHandler });
      mid.parent = root;
      const leaf = createElement('leaf');
      leaf.parent = mid;
      const event = createEventWithTarget(leaf, 'click');

      handleDelegatedEvent(event);
      expect(midHandler).toHaveBeenCalledOnce();
      expect(rootHandler).not.toHaveBeenCalled();
    });

    it('does nothing if no SimpElement is found', () => {
      const event = new Event('click');
      Object.defineProperty(event, 'target', { value: {}, writable: false });
      expect(() => handleDelegatedEvent(event)).not.toThrow();
    });
  });

  describe('handleDelegatedCaptureEvent', () => {
    const createEventWithTarget = (simpElement: any, type: string) => {
      const nativeEvent = new Event(type);
      Object.defineProperty(nativeEvent, 'target', { value: { __SIMP_ELEMENT__: simpElement }, writable: false });
      return nativeEvent;
    };

    it('calls capture handler on target element', () => {
      const handler = vi.fn();
      const simpElement = createElement('div', { onClickCapture: handler });
      const event = createEventWithTarget(simpElement, 'click');

      handleDelegatedCaptureEvent(event);
      expect(handler).toHaveBeenCalledOnce();
    });

    it('captures through all parents from root to target', () => {
      const rootHandler = vi.fn();
      const midHandler = vi.fn();
      const root = createElement('root', { onClickCapture: rootHandler });
      const mid = createElement('mid', { onClickCapture: midHandler });
      mid.parent = root;
      const leaf = createElement('leaf');
      leaf.parent = mid;
      const event = createEventWithTarget(leaf, 'click');

      handleDelegatedCaptureEvent(event);
      expect(rootHandler).toHaveBeenCalledOnce();
      expect(midHandler).toHaveBeenCalledOnce();
    });

    it('stops capture when stopPropagation is called', () => {
      const midHandler = vi.fn(e => e.stopPropagation());
      const leafHandler = vi.fn();
      const root = createElement('root');
      const mid = createElement('mid', { onClickCapture: midHandler });
      mid.parent = root;
      const leaf = createElement('leaf', { onClickCapture: leafHandler });
      leaf.parent = mid;
      const event = createEventWithTarget(leaf, 'click');

      handleDelegatedCaptureEvent(event);
      expect(midHandler).toHaveBeenCalledOnce();
      expect(leafHandler).not.toHaveBeenCalled();
    });

    it('does nothing if no SimpElement is found', () => {
      const event = new Event('click');
      Object.defineProperty(event, 'target', { value: {}, writable: false });
      expect(() => handleDelegatedCaptureEvent(event)).not.toThrow();
    });
  });

  describe('events with rerender in handlers (integration tests)', () => {
    // This simulates a rerender triggered by the leaf handler that removes the parent handlers,
    // but the bubbling phase must still call those handlers from the old tree snapshot.
    it('preserves bubbling even when parent handlers are removed during rerender triggered by child', () => {
      const rootHandler = vi.fn();
      const midHandler = vi.fn();

      const totalRoot = createElement(function App() {
        const flagRef = useRef(true);
        const leafRef = useRef(null);
        const rerender = useRerender();

        useEffect(() => {
          const nativeEvent = new Event('click');
          Object.defineProperty(nativeEvent, 'target', { value: leafRef.current, writable: false });
          handleDelegatedEvent(nativeEvent);
        }, []);

        return createElement(
          'root',
          { onClick: flagRef.current ? rootHandler : undefined },
          createElement(
            'mid',
            { onClick: flagRef.current ? midHandler : undefined },
            createElement('leaf', {
              ref: leafRef,
              onClick: () => {
                flagRef.current = false;
                rerender();
              },
            })
          )
        );
      });

      createRoot(new Element('div') as any).render(totalRoot);

      expect(midHandler).toHaveBeenCalledOnce();
      expect(rootHandler).toHaveBeenCalledOnce();
    });
  });
});
