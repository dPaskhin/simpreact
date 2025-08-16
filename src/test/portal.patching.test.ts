import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Element } from 'flyweight-dom';
import type { SimpElement } from '@simpreact/internal';
import {
  createElement,
  createPortal,
  Fragment,
  mountPortal,
  patchPortal,
  provideHostAdapter,
} from '@simpreact/internal';
import { testHostAdapter } from './test-host-adapter.js';
import { useEffect, useRef, useRerender } from '@simpreact/hooks';
import { dispatchDelegatedEvent } from '../main/dom/events.js';
import { render } from '@simpreact/dom';

provideHostAdapter(testHostAdapter);

describe('patchPortal', () => {
  let body: Element;
  let containerA: Element;
  let containerB: Element;

  beforeEach(() => {
    body = new Element('body');
    containerA = new Element('section');
    containerB = new Element('article');
    body.textContent = '';
    body.append(containerA, containerB);
    vi.clearAllMocks();
  });

  describe('base', () => {
    it('patches portal children without moving container if container is the same', () => {
      const prevChild = createElement('p', null, 'Old');
      const nextChild = createElement('p', null, 'New');

      const prevPortal = createPortal(prevChild, containerA);

      mountPortal(prevPortal, new Element('div'), null, null);

      const nextPortal = createPortal(nextChild, containerA);

      patchPortal(prevPortal, nextPortal, null);

      expect(containerA.contains(nextChild.reference)).toBe(true);
      expect(containerA.contains(prevChild.reference)).toBe(true);
    });

    it('moves child to new container if portal target changes', () => {
      const prevChild = createElement('span', null, 'Hello');
      const nextChild = createElement('span', null, 'Hello updated');

      const prevPortal = createPortal(prevChild, containerA);

      mountPortal(prevPortal, new Element('div'), null, null);

      const nextPortal = createPortal(nextChild, containerB);

      patchPortal(prevPortal, nextPortal, null);

      expect(containerB.contains(nextChild.reference)).toBe(true);
      expect(containerA.contains(prevChild.reference)).toBe(false);
    });
  });

  describe('patches elements with portals (integration tests)', () => {
    it('should properly replaces host element with portal element', () => {
      const totalRoot = createElement(function App() {
        const flagRef = useRef(false);
        const buttonRef = useRef(null);
        const rerender = useRerender();

        useEffect(() => {
          const nativeEvent = new Event('click');
          Object.defineProperty(nativeEvent, 'target', { value: buttonRef.current, writable: false });
          dispatchDelegatedEvent(nativeEvent);
        }, []);

        return createElement(
          Fragment,
          null,

          !flagRef.current && createElement('div', null, 'TEST'),

          flagRef.current && createPortal(createElement('div', null, 'PORTAL'), containerB),

          createElement(
            'button',
            {
              onClick: () => {
                flagRef.current = !flagRef.current;
                rerender();
              },
              ref: buttonRef,
            },
            'CLICK ME'
          )
        );
      });

      render(totalRoot, containerA as any);

      const portalElement = ((totalRoot.children as SimpElement).children as SimpElement[])[0];
      const buttonElement = ((totalRoot.children as SimpElement).children as SimpElement[])[1];

      expect((totalRoot.children as SimpElement).children).toStrictEqual([portalElement, buttonElement]);

      // PORTAL element has a placeholder host reference at the place where the PORTAL element is placed in a virtual DOM.
      expect(containerA.childNodes.length).toBe(2);
      expect(containerA.firstChild).toBe(portalElement!.reference);
      expect(containerA.lastChild).toBe(buttonElement!.reference);
    });
  });
});
