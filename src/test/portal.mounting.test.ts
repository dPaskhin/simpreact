import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Element } from 'flyweight-dom';
import { createElement, createPortal, mountPortal, provideHostAdapter } from '@simpreact/internal';
import { testHostAdapter } from './test-host-adapter.js';

provideHostAdapter(testHostAdapter);

describe('mountPortal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mounts a portal with a single child', () => {
    const container = new Element('div');
    const parentReference = new Element('div');
    const portal = createPortal(createElement('span'), container);

    mountPortal(portal, parentReference, null, null);

    expect(testHostAdapter.appendChild).toHaveBeenCalledWith(container, expect.objectContaining({ nodeName: 'span' }));
    expect(testHostAdapter.appendChild).toHaveBeenCalledWith(
      parentReference,
      expect.objectContaining({ textContent: '' })
    );

    expect(container.children.length).toBe(1);
    expect(container.firstChild!.nodeName).toBe('span');

    expect(parentReference.textContent).toBe('');

    expect(portal.reference).toStrictEqual(expect.objectContaining({ textContent: '' }));
  });

  it('does not mount any nodes to container if portal has no children', () => {
    const container = new Element('div');
    const parentReference = new Element('div');
    const portal = createPortal(null, container);

    mountPortal(portal, parentReference, null, null);

    expect(testHostAdapter.appendChild).toHaveBeenCalledWith(
      parentReference,
      expect.objectContaining({ textContent: '' })
    );

    expect(container.children.length).toBe(0);

    expect(parentReference.textContent).toBe('');

    expect(portal.reference).toStrictEqual(expect.objectContaining({ textContent: '' }));
  });
});
