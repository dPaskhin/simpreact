import {
  createElement,
  createPortal,
  Fragment,
  getLifecycleEventBus,
  mount,
  type SimpElement,
  type SimpRenderRuntime,
  unmount,
} from '@simpreact/internal';
import { emptyObject } from '@simpreact/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { domAdapter } from '../main/dom/domAdapter.js';
import { createCreateRoot } from '../main/dom/render.js';
import { testHostAdapter } from './test-host-adapter.js';

const renderRuntime: SimpRenderRuntime = {
  hostAdapter: testHostAdapter,
  renderer(type, element) {
    return type(element.props || emptyObject);
  },
  elementToHostMap: new Map(),
  renderStack: [],
  renderPhase: null,
  currentRenderingFCElement: null,
};

describe('unmounting', () => {
  let parent: Element;

  beforeEach(() => {
    vi.clearAllMocks();
    renderRuntime.renderStack.length = 0;
    renderRuntime.elementToHostMap.clear();
    parent = testHostAdapter.createReference('ROOT');
  });

  it('rejects unmounting while another render stack is in progress', () => {
    const element = createElement('div');
    renderRuntime.renderStack.push({} as never);

    expect(() => unmount(element, renderRuntime)).toThrow('Cannot unmount while rendering.');
  });

  it('unmounts descendants before their host parent and detaches references', () => {
    const element = createElement('section', null, createElement('span'), createElement('p'));
    mount(element, parent, null, null, null, renderRuntime);

    const firstChild = (element.children as SimpElement[])[0]!;
    const secondChild = (element.children as SimpElement[])[1]!;

    vi.clearAllMocks();

    unmount(element, renderRuntime);

    expect(testHostAdapter.unmountProps).toHaveBeenNthCalledWith(1, firstChild.reference, firstChild, renderRuntime);
    expect(testHostAdapter.unmountProps).toHaveBeenNthCalledWith(2, secondChild.reference, secondChild, renderRuntime);
    expect(testHostAdapter.unmountProps).toHaveBeenNthCalledWith(3, element.reference, element, renderRuntime);
    expect(testHostAdapter.detachElementFromReference).toHaveBeenCalledWith(firstChild.reference, renderRuntime);
    expect(testHostAdapter.detachElementFromReference).toHaveBeenCalledWith(secondChild.reference, renderRuntime);
    expect(testHostAdapter.detachElementFromReference).toHaveBeenCalledWith(element.reference, renderRuntime);
  });

  it('publishes functional component unmounts after child cleanup and clears stores', () => {
    const Child = () => createElement('span');
    const Parent = () => createElement(Child);
    const element = createElement(Parent);
    const events: SimpElement[] = [];
    const unsubscribe = getLifecycleEventBus(renderRuntime).subscribe(event => {
      if (event.type === 'unmounted') {
        events.push(event.element);
      }
    });

    mount(element, parent, null, null, null, renderRuntime);

    const childComponent = element.children as SimpElement;
    const childHost = childComponent.children as SimpElement;

    vi.clearAllMocks();

    unmount(element, renderRuntime);
    unsubscribe();

    expect(testHostAdapter.unmountProps).toHaveBeenCalledWith(childHost.reference, childHost, renderRuntime);
    expect(events).toEqual([childComponent, element]);
    expect(childComponent.unmounted).toBe(true);
    expect(element.unmounted).toBe(true);
  });

  it('does not unmount a functional component twice', () => {
    const Component = () => createElement('span');
    const element = createElement(Component);
    const listener = vi.fn();
    const unsubscribe = getLifecycleEventBus(renderRuntime).subscribe(event => {
      if (event.type === 'unmounted') {
        listener(event.element);
      }
    });

    mount(element, parent, null, null, null, renderRuntime);
    unmount(element, renderRuntime);

    expect(listener).toHaveBeenCalledTimes(1);

    vi.clearAllMocks();
    unmount(element, renderRuntime);
    unsubscribe();

    expect(testHostAdapter.unmountProps).not.toHaveBeenCalled();
    expect(testHostAdapter.detachElementFromReference).not.toHaveBeenCalled();
  });

  it('unmounts portal children from the portal target without touching siblings in the parent tree', () => {
    const portalTarget = testHostAdapter.createReference('PORTAL-TARGET');
    const element = createElement(
      Fragment,
      null,
      createPortal(createElement('span'), portalTarget),
      createElement('button')
    );

    mount(element, parent, null, null, null, renderRuntime);

    const portal = (element.children as SimpElement[])[0]!;
    const portalChild = portal.children as SimpElement;
    const sibling = (element.children as SimpElement[])[1]!;

    expect(parent.childNodes).toHaveLength(2);
    expect(portalTarget.childNodes).toHaveLength(1);

    vi.clearAllMocks();

    unmount(portal, renderRuntime);

    expect(testHostAdapter.removeChild).toHaveBeenCalledWith(portalTarget, portalChild.reference);
    expect(testHostAdapter.unmountProps).toHaveBeenCalledWith(portalChild.reference, portalChild, renderRuntime);
    expect(parent.contains(sibling.reference as Node)).toBe(true);
    expect(portalTarget.childNodes).toHaveLength(0);
  });

  it('cleans host mappings for the whole root after unmount', () => {
    const runtime: SimpRenderRuntime = {
      hostAdapter: domAdapter,
      renderer(type, element) {
        return type(element.props || emptyObject);
      },
      elementToHostMap: new Map(),
      renderStack: [],
      renderPhase: null,
      currentRenderingFCElement: null,
    };
    const root = createCreateRoot(runtime)(parent);

    root.render(createElement('div', null, createElement('span'), createElement('p')));

    expect(runtime.elementToHostMap.size).toBe(4);

    root.unmount();

    expect(parent.hasChildNodes()).toBe(false);
    expect(runtime.elementToHostMap.size).toBe(0);
  });
});
