import { createElement, createPortal, mountPortal, type SimpRenderRuntime } from '@simpreact/internal';
import { emptyObject } from '@simpreact/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { testHostAdapter } from './test-host-adapter.js';

const renderRuntime: SimpRenderRuntime = {
  hostAdapter: testHostAdapter,
  renderer(type, element) {
    return type(element.props || emptyObject);
  },
};

describe('mountPortal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mounts a portal with a single child', () => {
    const container = document.createElement('div');
    const parentReference = document.createElement('div');
    const portal = createPortal(createElement('span'), container);

    mountPortal(portal, parentReference, null, null, null, renderRuntime);

    expect(testHostAdapter.appendChild).toHaveBeenCalledWith(container, document.createElement('span'));
    expect(testHostAdapter.appendChild).toHaveBeenCalledWith(parentReference, document.createTextNode(''));

    expect(container.children.length).toBe(1);
    expect((container.firstChild as HTMLSpanElement)!.nodeName).toBe('SPAN');

    expect(parentReference.textContent).toBe('');

    expect((portal.reference as Text).textContent).toStrictEqual('');
  });

  it('does not mount any nodes to container if portal has no children', () => {
    const container = document.createElement('div');
    const parentReference = document.createElement('div');
    const portal = createPortal(null, container);

    mountPortal(portal, parentReference, null, null, null, renderRuntime);

    expect(testHostAdapter.appendChild).toHaveBeenCalledWith(
      parentReference,
      expect.objectContaining({ textContent: '' })
    );

    expect(container.children.length).toBe(0);

    expect(parentReference.textContent).toBe('');

    expect((portal.reference as Text).textContent).toStrictEqual('');
  });
});
