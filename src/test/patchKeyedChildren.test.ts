import {
  HOST_OPS_PLACE_ELEMENT_BEFORE_ANCHOR,
  type RenderFrame,
  SIMP_ELEMENT_FLAG_HOST,
  TraversalStack,
} from '@simpreact/internal';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { _pushMountFrame } from '../main/core/mounting.js';
import { _pushPatchFrame } from '../main/core/patching.js';
import { _patchKeyedChildren } from '../main/core/patchingChildren.js';
import { _remove } from '../main/core/unmounting.js';
import { findHostReferenceFromElement } from '../main/core/utils.js';

vi.mock('../main/core/patching.js', () => ({ _pushPatchFrame: vi.fn() }));
vi.mock('../main/core/mounting.js', () => ({ _pushMountFrame: vi.fn() }));
vi.mock('../main/core/unmounting.js', () => ({ _remove: vi.fn() }));
vi.mock('../main/core/utils.js', () => ({ findHostReferenceFromElement: vi.fn() }));

type HostReference = { id: string };
type Key = string;

type SimpElement = {
  key: Key;
  flag: number;
  reference?: HostReference;
};

type SimpRenderRuntime = {
  hostAdapter: {
    insertBefore: (parent: HostReference, node: HostReference, before: HostReference) => void;
  };
};

function el(key: string, ref?: string): SimpElement {
  return { key, flag: SIMP_ELEMENT_FLAG_HOST, reference: ref ? { id: ref } : undefined };
}

function ref(id: string): HostReference {
  return { id };
}

function makeFrame(
  prev: SimpElement[],
  next: SimpElement[],
  parent: HostReference,
  nextRef: HostReference,
  runtime: SimpRenderRuntime
): RenderFrame {
  return {
    node: {
      children: next,
    } as any,
    phase: 0,
    meta: {
      prevElement: { children: prev } as any,
      parentReference: parent,
      parentAnchorReference: nextRef,
      rightSibling: null,
      context: null,
      hostNamespace: undefined,
      renderRuntime: runtime as any,
      placeHolderElement: null,
    },
  };
}

describe('patchKeyedChildren', () => {
  const parent = ref('PARENT');
  const nextRef = ref('NEXT_REF');

  let calls: string[];
  let runtime: SimpRenderRuntime;

  beforeEach(() => {
    vi.clearAllMocks();

    calls = [];

    runtime = {
      hostAdapter: {
        insertBefore: vi.fn((_p, node, before) => {
          calls.push(`insertBefore(${node.id} -> ${before.id})`);
        }),
      },
    };

    vi.mocked(_pushPatchFrame).mockImplementation(frame => {
      frame.node.reference = frame.meta.prevElement!.reference;
      calls.push(`patch(${frame.meta.prevElement!.key} -> ${frame.node.key})`);
    });

    vi.mocked(_remove).mockImplementation(prev => {
      calls.push(`remove(${prev.key})`);
    });

    vi.mocked(_pushMountFrame).mockImplementation(frame => {
      frame.node.reference = { id: `ref:${frame.node.key}` };
      calls.push(
        `mount(${frame.node.key} before ${(frame.meta.parentAnchorReference as any).id} and right sibling ${frame.meta.rightSibling?.key || 'null'})`
      );
    });

    vi.mocked(findHostReferenceFromElement).mockImplementation(node => {
      return node?.reference || null;
    });
  });

  it('Step 1: syncs from start while keys match', () => {
    const prev = [el('a', 'ref:a'), el('b', 'ref:b'), el('c', 'ref:c')];
    const next = [el('a'), el('b'), el('x')];

    _patchKeyedChildren(makeFrame(prev, next, parent, nextRef, runtime));

    expect(calls).toContain('patch(a -> a)');
    expect(calls).toContain('patch(b -> b)');
    expect(calls).toContain('remove(c)');
    expect(calls).toContain('mount(x before NEXT_REF and right sibling null)');
  });

  it('Step 2: syncs from end while keys match', () => {
    const prev = [el('a', 'ref:a'), el('b', 'ref:b'), el('c', 'ref:c')];
    const next = [el('x'), el('b'), el('c')];

    _patchKeyedChildren(makeFrame(prev, next, parent, nextRef, runtime));

    expect(calls).toContain('patch(b -> b)');
    expect(calls).toContain('patch(c -> c)');
    expect(calls).toContain('mount(x before NEXT_REF and right sibling b)');
    expect(calls).toContain('remove(a)');
  });

  it('Step 3: when next list is exhausted, removes remaining prev (after start sync patches)', () => {
    const prev = [el('a', 'ref:a'), el('b', 'ref:b')];
    const next = [el('a')];

    _patchKeyedChildren(makeFrame(prev, next, parent, nextRef, runtime));

    expect(calls).toEqual(['remove(b)', 'patch(a -> a)']);

    expect(vi.mocked(_pushMountFrame)).not.toHaveBeenCalled();
    expect(runtime.hostAdapter.insertBefore).not.toHaveBeenCalled();
  });

  it('Step 4: when prev list is exhausted (no stable right sibling), mounts all next using nextRef as anchor', () => {
    const next = [el('a'), el('b')];

    _patchKeyedChildren(makeFrame([], next, parent, nextRef, runtime));

    expect(calls).toEqual([
      'mount(b before NEXT_REF and right sibling null)',
      'mount(a before NEXT_REF and right sibling b)',
    ]);

    expect(vi.mocked(_pushPatchFrame)).not.toHaveBeenCalled();
    expect(vi.mocked(_remove)).not.toHaveBeenCalled();
    expect(vi.mocked(findHostReferenceFromElement)).not.toHaveBeenCalled();
    expect(runtime.hostAdapter.insertBefore).not.toHaveBeenCalled();
  });

  it('Step 4: when prev list is exhausted between stable nodes, uses rightSibling as anchor', () => {
    const prev = [el('a', 'ref:a'), el('c', 'ref:c')];
    const next = [el('a'), el('b'), el('c')];

    _patchKeyedChildren(makeFrame(prev, next, parent, nextRef, runtime));

    expect(calls).toEqual(['mount(b before NEXT_REF and right sibling c)', 'patch(c -> c)', 'patch(a -> a)']);

    expect(vi.mocked(_remove)).not.toHaveBeenCalled();
    expect(runtime.hostAdapter.insertBefore).not.toHaveBeenCalled();
  });

  it('Step 5: reorder only (no mount/remove), still issues HOST_OPS_PLACE_ELEMENT_BEFORE_ANCHOR for existing nodes in reverse pass', () => {
    const prev = [el('a', 'ref:a'), el('b', 'ref:b'), el('c', 'ref:c')];
    const next = [el('b'), el('a'), el('c')];

    const stack = new TraversalStack();

    _patchKeyedChildren(makeFrame(prev, next, parent, nextRef, Object.assign({ renderStack: stack }, runtime)));

    expect(calls).toEqual(['patch(a -> a)', 'patch(b -> b)', 'patch(c -> c)']);

    expect(vi.mocked(_pushMountFrame)).not.toHaveBeenCalled();
    expect(vi.mocked(_remove)).not.toHaveBeenCalled();

    // i=a -> insertBefore(ref:a -> ref:c)
    // i=b -> insertBefore(ref:b -> ref:a)
    expect((stack as any).stack[0].phase).toBe(HOST_OPS_PLACE_ELEMENT_BEFORE_ANCHOR);
    expect((stack as any).stack[0].node.key).toBe('a');
    expect((stack as any).stack[0].meta.rightSibling.key).toBe('c');

    expect((stack as any).stack[1].phase).toBe(HOST_OPS_PLACE_ELEMENT_BEFORE_ANCHOR);
    expect((stack as any).stack[1].node.key).toBe('b');
    expect((stack as any).stack[1].meta.rightSibling.key).toBe('a');
  });

  it('Step 5: remove-only (some prev keys not present in next)', () => {
    const prev = [el('a', 'ref:a'), el('b', 'ref:b'), el('c', 'ref:c')];
    const next = [el('a'), el('c')];

    _patchKeyedChildren(makeFrame(prev, next, parent, nextRef, runtime));

    expect(calls).toEqual(['remove(b)', 'patch(c -> c)', 'patch(a -> a)']);
    expect(vi.mocked(_pushMountFrame)).not.toHaveBeenCalled();
  });

  it('Step 5 mixed: patch reusable, then remove unused, then mount new, then move/insert in final order', () => {
    const prev = [el('a', 'ref:a'), el('b', 'ref:b'), el('c', 'ref:c'), el('d', 'ref:d')];
    const next = [el('d'), el('b'), el('e'), el('a')];

    const stack = new TraversalStack();

    _patchKeyedChildren(makeFrame(prev, next, parent, nextRef, Object.assign({ renderStack: stack }, runtime)));

    expect(calls).toEqual([
      'remove(c)',
      'patch(a -> a)',
      'mount(e before NEXT_REF and right sibling a)',
      'patch(b -> b)',
      'patch(d -> d)',
    ]);
  });

  it('handles empty -> empty (no ops)', () => {
    _patchKeyedChildren(makeFrame([], [], parent, nextRef, runtime));
    expect(calls).toEqual([]);
    expect(vi.mocked(_pushPatchFrame)).not.toHaveBeenCalled();
    expect(vi.mocked(_pushPatchFrame)).not.toHaveBeenCalled();
    expect(vi.mocked(_remove)).not.toHaveBeenCalled();
    expect(runtime.hostAdapter.insertBefore).not.toHaveBeenCalled();
  });
});
