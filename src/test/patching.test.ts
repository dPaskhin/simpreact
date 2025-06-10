import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Element } from 'flyweight-dom';
import { mount } from '../main/core/mounting';
import type { LifecycleEvent } from '../main/core/global';
import { GLOBAL } from '../main/core/global';
import type { SimpElement } from '../main/core';
import { createElement, Fragment } from '../main/core';
import { spyOnHostAdapterMethods, testHostAdapter } from './test-host-adapter';
import { patch } from '../main/core/patching';
import { EventBus } from '../main/shared';
import type { HostReference } from '../main/core/hostAdapter';

const globalEventBus = new EventBus<LifecycleEvent>();

Object.defineProperty(GLOBAL, 'hostAdapter', { value: testHostAdapter });
Object.defineProperty(GLOBAL, 'eventBus', { value: globalEventBus });

function createFragmentWithChildren(...elements: SimpElement[]): SimpElement {
  return createElement<any>(Fragment, null!, ...elements);
}

describe('patching', () => {
  let parent: Element;

  beforeEach(() => {
    parent = testHostAdapter.createReference('ROOT');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('patchKeyedChildren (integration tests)', () => {
    it('mounts new children if no previous', () => {
      const next = createFragmentWithChildren(createElement('a', { key: '1' }), createElement('b', { key: '2' }));

      mount(next, parent as HostReference, null, null);

      expect(parent.children.length).toBe(2);
      expect(parent.children[0]!.nodeName).toBe('a');
      expect(parent.children[1]!.nodeName).toBe('b');
    });

    it('removes all when new is empty', () => {
      const prev = createFragmentWithChildren(createElement('a', { key: '1' }), createElement('b', { key: '2' }));

      mount(prev, parent as HostReference, null, null);

      const next = createFragmentWithChildren();

      patch(prev, next, parent as HostReference, null, null);

      expect(parent.children.length).toBe(0);
    });

    it('patches nodes with same keys', () => {
      const prev = createElement(Fragment, { children: createElement('a', { id: 'prev', key: '1' }) });
      mount(prev, parent as HostReference, null, null);

      const next = createElement(Fragment, { children: createElement('a', { id: 'next', key: '1' }) });
      patch(prev, next, parent as HostReference, null, null);

      expect((prev.children as SimpElement).reference).toStrictEqual((next.children as SimpElement).reference);
      expect((parent.children[0] as Element)!.getAttribute('id')).toBe('next');
    });

    it('reorders children', () => {
      const prev = createFragmentWithChildren(
        createElement('a', { key: '1' }),
        createElement('b', { key: '2' }),
        createElement('c', { key: '3' })
      );
      mount(prev, parent as HostReference, null, null);

      const next = createFragmentWithChildren(
        createElement('c', { key: '3' }),
        createElement('a', { key: '1' }),
        createElement('b', { key: '2' })
      );
      const spyOnHostAdapter = spyOnHostAdapterMethods();
      patch(prev, next, parent as HostReference, null, null);

      expect(Array.from(parent.children).map(c => c.nodeName)).toEqual(['c', 'a', 'b']);

      // References were just moved without recreating.
      expect((prev.children as SimpElement[])[0]!.reference).toEqual((next.children as SimpElement[])[1]!.reference);
      expect((prev.children as SimpElement[])[1]!.reference).toEqual((next.children as SimpElement[])[2]!.reference);
      expect((prev.children as SimpElement[])[2]!.reference).toEqual((next.children as SimpElement[])[0]!.reference);

      // Place 'a' and 'b' at the end of list because of the reordering.
      expect(spyOnHostAdapter.insertBefore).toHaveBeenNthCalledWith(
        1,
        parent,
        expect.objectContaining({ nodeName: 'b' }),
        null
      );
      expect(spyOnHostAdapter.insertBefore).toHaveBeenNthCalledWith(
        2,
        parent,
        expect.objectContaining({ nodeName: 'a' }),
        expect.objectContaining({ nodeName: 'b' })
      );
      expect(spyOnHostAdapter.appendChild).not.toHaveBeenCalled();
      expect(spyOnHostAdapter.setTextContent).not.toHaveBeenCalled();
      expect(spyOnHostAdapter.removeChild).not.toHaveBeenCalled();
      expect(spyOnHostAdapter.replaceChild).not.toHaveBeenCalled();
    });

    it('adds new children in middle', () => {
      const prev = createFragmentWithChildren(createElement('a', { key: '1' }), createElement('c', { key: '3' }));
      mount(prev, parent as HostReference, null, null);

      const next = createFragmentWithChildren(
        createElement('a', { key: '1' }),
        createElement('b', { key: '2' }),
        createElement('c', { key: '3' })
      );
      const spyOnHostAdapter = spyOnHostAdapterMethods();
      patch(prev, next, parent as HostReference, null, null);

      expect(Array.from(parent.children).map(c => c.nodeName)).toEqual(['a', 'b', 'c']);
      expect(spyOnHostAdapter.appendChild).not.toHaveBeenCalled();
      expect(spyOnHostAdapter.setTextContent).not.toHaveBeenCalled();
      expect(spyOnHostAdapter.removeChild).not.toHaveBeenCalled();
      expect(spyOnHostAdapter.replaceChild).not.toHaveBeenCalled();
      // It should be only one inserting in the case.
      // insertOrAppend function is just a wrapper for insertBefore, so this call is expected.
      expect(spyOnHostAdapter.insertOrAppend).toHaveBeenNthCalledWith(
        1,
        parent,
        expect.objectContaining({ nodeName: 'b' }),
        expect.objectContaining({ nodeName: 'c' })
      );
      expect(spyOnHostAdapter.insertBefore).toHaveBeenNthCalledWith(
        1,
        parent,
        expect.objectContaining({ nodeName: 'b' }),
        expect.objectContaining({ nodeName: 'c' })
      );
    });

    it('removes children from middle', () => {
      const prev = createFragmentWithChildren(
        createElement('a', { key: '1' }),
        createElement('b', { key: '2' }),
        createElement('c', { key: '3' })
      );
      mount(prev, parent as HostReference, null, null);

      const next = createFragmentWithChildren(createElement('a', { key: '1' }), createElement('c', { key: '3' }));
      const spyOnHostAdapter = spyOnHostAdapterMethods();
      patch(prev, next, parent as HostReference, null, null);

      expect(Array.from(parent.children).map(c => c.nodeName)).toEqual(['a', 'c']);
      // It should be only one inserting in the case.
      expect(spyOnHostAdapter.appendChild).not.toHaveBeenCalled();
      expect(spyOnHostAdapter.setTextContent).not.toHaveBeenCalled();
      expect(spyOnHostAdapter.removeChild).toHaveBeenNthCalledWith(
        1,
        parent,
        expect.objectContaining({ nodeName: 'b' })
      );
      expect(spyOnHostAdapter.replaceChild).not.toHaveBeenCalled();
      expect(spyOnHostAdapter.insertOrAppend).not.toHaveBeenCalled();
      expect(spyOnHostAdapter.insertBefore).not.toHaveBeenCalled();
    });
  });

  describe('patchKeyedChildren with functional components (integration tests)', () => {
    const Fn = ({ id }: { id: string }) => createElement('x-fn', { id });

    it('replaces component with different key', () => {
      const prev = createElement(Fn, { id: 'prev', key: '1' });
      mount(prev, parent as HostReference, null, null);

      const prevRef = (prev.children as SimpElement).reference! as Element;

      const next = createElement(Fn, { id: 'next', key: '2' });
      const spyOnHostAdapter = spyOnHostAdapterMethods();
      const onMounted = vi.fn<(element: SimpElement) => void>();
      const onUnmounted = vi.fn<(element: SimpElement) => void>();
      const onBeforeRender = vi.fn<(element: SimpElement) => void>();
      const onAfterRender = vi.fn();

      globalEventBus.subscribe(event => {
        if (event.type === 'mounted') {
          onMounted(event.element);
        }
        if (event.type === 'unmounted') {
          onUnmounted(event.element);
        }
        if (event.type === 'beforeRender') {
          onBeforeRender(event.element);
        }
        if (event.type === 'afterRender') {
          onAfterRender();
        }
      });

      patch(prev, next, parent as HostReference, null, null);

      const nextRef = (next.children as SimpElement).reference! as Element;

      expect(prevRef).not.toBe(nextRef);
      expect(nextRef.getAttribute('id')).toBe('next');

      // Because of unmount and mount sequence there are remove and append mutations in DOM.
      expect(spyOnHostAdapter.removeChild).toHaveBeenNthCalledWith(
        1,
        parent,
        expect.objectContaining({ nodeName: 'x-fn' })
      );
      // insertOrAppend function is just a wrapper for insertBefore, so this call is expected.
      expect(spyOnHostAdapter.insertOrAppend).toHaveBeenNthCalledWith(1, parent, nextRef, prevRef);
      expect(spyOnHostAdapter.insertBefore).toHaveBeenNthCalledWith(1, parent, nextRef, prevRef);
      expect(spyOnHostAdapter.replaceChild).not.toHaveBeenCalled();
      expect(spyOnHostAdapter.appendChild).not.toHaveBeenCalled();
      expect(spyOnHostAdapter.setTextContent).not.toHaveBeenCalled();

      // Expect the prev component to be unmounted and the next one is mounted.
      // Regardless of the same type (Component) identity.
      expect(onUnmounted).toHaveBeenNthCalledWith(1, prev);
      expect(onMounted).toHaveBeenNthCalledWith(1, next);

      expect(onBeforeRender).toHaveBeenNthCalledWith(1, next);
      expect(onAfterRender).toHaveBeenNthCalledWith(1);
    });
  });
});
