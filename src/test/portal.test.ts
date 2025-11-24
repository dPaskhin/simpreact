import { createElement, createPortal, SimpElementFlag } from '@simpreact/internal';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('createPortal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a portal element with children and container', () => {
    const children = createElement('div');
    const container = document.createElement('section');

    const portal = createPortal(children, container);

    expect(portal.flag).toBe(SimpElementFlag.PORTAL);
    expect(portal.parent).toBeNull();
    expect(portal.children).toBe(children);
    expect(portal.ref).toBe(container);
  });

  it('creates a portal element without children if they are not provided', () => {
    const container = document.createElement('div');

    const portal = createPortal(null, container);

    expect(portal.flag).toBe(SimpElementFlag.PORTAL);
    expect(portal.parent).toBeNull();
    expect(portal.children).toBeNull();
    expect(portal.ref).toBe(container);
  });
});
