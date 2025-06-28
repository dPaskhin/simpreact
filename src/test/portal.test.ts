import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createElement, createPortal } from '@simpreact/internal';

describe('createPortal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a portal element with children and container', () => {
    const children = createElement('div');
    const container = document.createElement('section');

    const portal = createPortal(children, container);

    expect(portal.flag).toBe('PORTAL');
    expect(portal.parent).toBeNull();
    expect(portal.children).toBe(children);
    expect(portal.ref).toBe(container);
  });

  it('creates a portal element without children if they are not provided', () => {
    const container = document.createElement('div');

    const portal = createPortal(null, container);

    expect(portal.flag).toBe('PORTAL');
    expect(portal.parent).toBeNull();
    expect(portal.children).toBeUndefined();
    expect(portal.ref).toBe(container);
  });
});
