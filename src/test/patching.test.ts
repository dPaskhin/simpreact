import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Element } from 'flyweight-dom';

import type { HostReference, SimpElement } from '@simpreact/internal';
import {
  createContext,
  createElement,
  Fragment,
  lifecycleEventBus,
  mount,
  patch,
  provideHostAdapter,
} from '@simpreact/internal';
import { testHostAdapter } from './test-host-adapter';

provideHostAdapter(testHostAdapter);

function createFragmentWithChildren(...elements: SimpElement[]): SimpElement {
  return createElement(Fragment, null!, ...elements);
}

describe('patching', () => {
  let parent: Element;

  beforeEach(() => {
    vi.restoreAllMocks();
    parent = testHostAdapter.createReference('ROOT', '');
  });

  describe('patchKeyedChildren (integration tests)', () => {
    it('mounts new children if no previous', () => {
      const next = createFragmentWithChildren(createElement('a', { key: '1' }), createElement('b', { key: '2' }));

      mount(next, parent as HostReference, null, null, '');

      expect(parent.children.length).toBe(2);
      expect(parent.children[0]!.nodeName).toBe('a');
      expect(parent.children[1]!.nodeName).toBe('b');
    });

    it('removes all when new is empty', () => {
      const prev = createFragmentWithChildren(createElement('a', { key: '1' }), createElement('b', { key: '2' }));

      mount(prev, parent as HostReference, null, null, '');

      const next = createFragmentWithChildren();

      patch(prev, next, parent as HostReference, null, null, '');

      expect(parent.children.length).toBe(0);
    });

    it('patches nodes with same keys', () => {
      const prev = createElement(Fragment, { children: createElement('a', { id: 'prev', key: '1' }, '1') });
      mount(prev, parent as HostReference, null, null, '');

      const next = createElement(Fragment, { children: createElement('a', { id: 'next', key: '1' }) });

      // Restore mocks before accumulation of host provider methods invokes.
      vi.resetAllMocks();

      patch(prev, next, parent as HostReference, null, null, '');

      expect((prev.children as SimpElement).reference).toStrictEqual((next.children as SimpElement).reference);
      expect(testHostAdapter.patchProps).toHaveBeenCalledWith(
        (prev.children as SimpElement).reference,
        prev.children,
        next.children,
        ''
      );
    });

    it('reorders children', () => {
      const prev = createFragmentWithChildren(
        createElement('a', { key: '1' }),
        createElement('b', { key: '2' }),
        createElement('c', { key: '3' })
      );
      mount(prev, parent as HostReference, null, null, '');

      const next = createFragmentWithChildren(
        createElement('c', { key: '3' }),
        createElement('a', { key: '1' }),
        createElement('b', { key: '2' })
      );

      // Restore mocks before accumulation of host provider methods invokes.
      vi.resetAllMocks();

      patch(prev, next, parent as HostReference, null, null, '');

      expect(Array.from(parent.children).map(c => c.nodeName)).toEqual(['c', 'a', 'b']);

      // References were just moved without recreating.
      expect((prev.children as SimpElement[])[0]!.reference).toEqual((next.children as SimpElement[])[1]!.reference);
      expect((prev.children as SimpElement[])[1]!.reference).toEqual((next.children as SimpElement[])[2]!.reference);
      expect((prev.children as SimpElement[])[2]!.reference).toEqual((next.children as SimpElement[])[0]!.reference);

      // Place 'a' and 'b' at the end of list because of the reordering.
      expect(testHostAdapter.insertBefore).toHaveBeenNthCalledWith(
        1,
        parent,
        expect.objectContaining({ nodeName: 'b' }),
        null
      );
      expect(testHostAdapter.insertBefore).toHaveBeenNthCalledWith(
        2,
        parent,
        expect.objectContaining({ nodeName: 'a' }),
        expect.objectContaining({ nodeName: 'b' })
      );
      expect(testHostAdapter.appendChild).not.toHaveBeenCalled();
      expect(testHostAdapter.setTextContent).not.toHaveBeenCalled();
      expect(testHostAdapter.removeChild).not.toHaveBeenCalled();
      expect(testHostAdapter.replaceChild).not.toHaveBeenCalled();
      expect(testHostAdapter.insertOrAppend).not.toHaveBeenCalled();
      expect(testHostAdapter.clearNode).not.toHaveBeenCalled();
    });

    it('adds new children in middle', () => {
      const prev = createFragmentWithChildren(createElement('a', { key: '1' }), createElement('c', { key: '3' }));
      mount(prev, parent as HostReference, null, null, '');

      const next = createFragmentWithChildren(
        createElement('a', { key: '1' }),
        createElement('b', { key: '2' }),
        createElement('c', { key: '3' })
      );

      // Restore mocks before accumulation of host provider methods invokes.
      vi.resetAllMocks();

      patch(prev, next, parent as HostReference, null, null, '');

      expect(Array.from(parent.children).map(c => c.nodeName)).toEqual(['a', 'b', 'c']);
      expect(testHostAdapter.appendChild).not.toHaveBeenCalled();
      expect(testHostAdapter.setTextContent).not.toHaveBeenCalled();
      expect(testHostAdapter.removeChild).not.toHaveBeenCalled();
      expect(testHostAdapter.replaceChild).not.toHaveBeenCalled();
      // It should be only one inserting in the case.
      // insertOrAppend function is just a wrapper for insertBefore, so this call is expected.
      expect(testHostAdapter.insertOrAppend).toHaveBeenNthCalledWith(
        1,
        parent,
        expect.objectContaining({ nodeName: 'b' }),
        expect.objectContaining({ nodeName: 'c' })
      );
      expect(testHostAdapter.insertBefore).toHaveBeenNthCalledWith(
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
      mount(prev, parent as HostReference, null, null, '');

      const next = createFragmentWithChildren(createElement('a', { key: '1' }), createElement('c', { key: '3' }));

      // Restore mocks before accumulation of host provider methods invokes.
      vi.resetAllMocks();

      patch(prev, next, parent as HostReference, null, null, '');

      expect(Array.from(parent.children).map(c => c.nodeName)).toEqual(['a', 'c']);
      // It should be only one inserting in the case.
      expect(testHostAdapter.appendChild).not.toHaveBeenCalled();
      expect(testHostAdapter.setTextContent).not.toHaveBeenCalled();
      expect(testHostAdapter.removeChild).toHaveBeenNthCalledWith(
        1,
        parent,
        expect.objectContaining({ nodeName: 'b' })
      );
      expect(testHostAdapter.replaceChild).not.toHaveBeenCalled();
      expect(testHostAdapter.insertOrAppend).not.toHaveBeenCalled();
      expect(testHostAdapter.insertBefore).not.toHaveBeenCalled();
    });
  });

  describe('patchKeyedChildren with functional components (integration tests)', () => {
    const Fn = ({ id }: { id: string }) => createElement('x-fn', { id });

    it('replaces component with different key', () => {
      const prev = createElement(Fn, { id: 'prev', key: '1' });
      mount(prev, parent as HostReference, null, null, '');

      const prevRef = (prev.children as SimpElement).reference! as Element;

      const next = createElement(Fn, { id: 'next', key: '2' });

      // Restore mocks before accumulation of host provider methods invokes.
      vi.resetAllMocks();

      const listener = vi.fn();

      lifecycleEventBus.subscribe(listener);

      patch(prev, next, parent as HostReference, null, null, '');

      const nextRef = (next.children as SimpElement).reference! as Element;

      expect(prevRef).not.toBe(nextRef);

      expect(testHostAdapter.mountProps).toHaveBeenCalledExactlyOnceWith(nextRef, next.children, '');

      // Because of unmount and mount sequence there are remove and append mutations in DOM.
      expect(testHostAdapter.removeChild).toHaveBeenNthCalledWith(
        1,
        parent,
        expect.objectContaining({ nodeName: 'x-fn' })
      );
      // insertOrAppend function is just a wrapper for insertBefore, so this call is expected.
      expect(testHostAdapter.insertOrAppend).toHaveBeenNthCalledWith(1, parent, nextRef, prevRef);
      expect(testHostAdapter.insertBefore).toHaveBeenNthCalledWith(1, parent, nextRef, prevRef);
      expect(testHostAdapter.replaceChild).not.toHaveBeenCalled();
      expect(testHostAdapter.appendChild).not.toHaveBeenCalled();
      expect(testHostAdapter.setTextContent).not.toHaveBeenCalled();

      // Expect the prev component to be unmounted and the next one is mounted.
      // Regardless of the same type (Component) identity.
      expect(listener).toHaveBeenCalledWith({ type: 'unmounted', element: prev });
      expect(listener).toHaveBeenCalledWith({ type: 'mounted', element: next });
      expect(listener).toHaveBeenCalledWith({ type: 'beforeRender', element: next });
      expect(listener).toHaveBeenCalledWith({ type: 'afterRender' });
      expect(listener).toHaveBeenCalledTimes(4);
    });
  });

  describe('patch children', () => {
    describe('fragment', () => {
      it('fragment children - from many elements to single element', () => {
        const prev = createElement(
          'div',
          null,
          createFragmentWithChildren(createElement('a'), createElement('b')),
          createElement('span')
        );
        mount(prev, parent as HostReference, null, null, '');

        const next = createElement(
          'div',
          null,
          createFragmentWithChildren(createElement('a', { key: '3' })),
          createElement('span')
        );

        // Restore mocks before accumulation of host provider methods invokes.
        vi.resetAllMocks();

        patch(prev, next, parent as HostReference, null, null, '');

        expect((next.reference as Element).children[0]).toEqual(expect.objectContaining({ nodeName: 'a' }));
        expect((next.reference as Element).children[1]).toEqual(expect.objectContaining({ nodeName: 'span' }));
      });
    });

    describe('provider element', () => {
      const context = createContext('TEST');

      it('from many elements to single element', () => {
        const prev = createElement(
          'div',
          null,
          createElement(context.Provider, { value: '' }, createElement('a'), createElement('b')),
          createElement('span')
        );
        mount(prev, parent as HostReference, null, null, '');

        const next = createElement(
          'div',
          null,
          createElement(context.Provider, { value: '' }, createElement('a')),
          createElement('span')
        );

        // Restore mocks before accumulation of host provider methods invokes.
        vi.resetAllMocks();

        patch(prev, next, parent as HostReference, null, null, '');

        expect((next.reference as Element).children[0]).toEqual(expect.objectContaining({ nodeName: 'a' }));
        expect((next.reference as Element).children[1]).toEqual(expect.objectContaining({ nodeName: 'span' }));
      });
    });
  });
});
