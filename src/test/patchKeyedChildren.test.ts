import { type RenderFrame, SIMP_ELEMENT_FLAG_HOST } from '@simpreact/internal';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { _pushHostOperationPlaceElement } from '../main/core/hostOperations.js';
import { _pushMountEnterFrame } from '../main/core/mounting.js';
import { _pushPatchEnterFrame } from '../main/core/patching.js';
import { _patchKeyedChildren } from '../main/core/patchingChildren.js';
import { _remove } from '../main/core/unmounting.js';
import { findHostReferenceFromElement } from '../main/core/utils.js';

vi.mock('../main/core/patching.js', () => ({ _pushPatchEnterFrame: vi.fn() }));
vi.mock('../main/core/mounting.js', () => ({ _pushMountEnterFrame: vi.fn() }));
vi.mock('../main/core/unmounting.js', () => ({ _remove: vi.fn() }));
vi.mock('../main/core/utils.js', () => ({ findHostReferenceFromElement: vi.fn() }));
vi.mock('../main/core/hostOperations.js', () => ({ _pushHostOperationPlaceElement: vi.fn() }));

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

    vi.mocked(_pushPatchEnterFrame).mockImplementation((element, meta) => {
      element.reference = meta.prevElement!.reference;
      calls.push(
        `patch(${meta.prevElement!.key} -> ${element.key} before right sibling ${meta.rightSibling?.key || 'null'})`
      );
    });

    vi.mocked(_remove).mockImplementation(prev => {
      calls.push(`remove(${prev.key})`);
    });

    vi.mocked(_pushMountEnterFrame).mockImplementation((element, meta) => {
      element.reference = { id: `ref:${element.key}` };
      calls.push(`mount(${element.key} before right sibling ${meta.rightSibling?.key || 'null'})`);
    });

    vi.mocked(_pushHostOperationPlaceElement).mockImplementation((element, meta) => {
      calls.push(`placeElementBeforeAnchor(${element.key} before right sibling ${meta.rightSibling?.key || 'null'})`);
    });

    vi.mocked(findHostReferenceFromElement).mockImplementation(node => {
      return node?.reference || null;
    });
  });

  it('Step 1: syncs from start while keys match', () => {
    const prev = [el('a', 'ref:a'), el('b', 'ref:b'), el('c', 'ref:c')];
    const next = [el('a'), el('b'), el('x')];

    _patchKeyedChildren(makeFrame(prev, next, parent, runtime));

    expect(calls).toEqual([
      'patch(a -> a before right sibling b)',
      'patch(b -> b before right sibling x)',
      'remove(c)',
      'mount(x before right sibling null)',
    ]);
  });

  it('Step 2: syncs from end while keys match', () => {
    const prev = [el('a', 'ref:a'), el('b', 'ref:b'), el('c', 'ref:c')];
    const next = [el('x'), el('b'), el('c')];

    _patchKeyedChildren(makeFrame(prev, next, parent, runtime));

    expect(calls).toEqual([
      'remove(a)',
      'mount(x before right sibling b)',
      'patch(b -> b before right sibling c)',
      'patch(c -> c before right sibling null)',
    ]);
  });

  it('Step 3: when next list is exhausted, removes remaining prev (after start sync patches)', () => {
    const prev = [el('a', 'ref:a'), el('b', 'ref:b')];
    const next = [el('a')];

    _patchKeyedChildren(makeFrame(prev, next, parent, runtime));

    expect(calls).toEqual(['patch(a -> a before right sibling null)', 'remove(b)']);

    expect(vi.mocked(_pushMountEnterFrame)).not.toHaveBeenCalled();
    expect(runtime.hostAdapter.insertBefore).not.toHaveBeenCalled();
  });

  it('Step 4: when prev list is exhausted (no stable right sibling), mounts all next using rightSibling as anchor', () => {
    const next = [el('a'), el('b')];

    _patchKeyedChildren(makeFrame([], next, parent, runtime));

    expect(calls).toEqual(['mount(a before right sibling b)', 'mount(b before right sibling null)']);

    expect(vi.mocked(_pushPatchEnterFrame)).not.toHaveBeenCalled();
    expect(vi.mocked(_remove)).not.toHaveBeenCalled();
    expect(vi.mocked(findHostReferenceFromElement)).not.toHaveBeenCalled();
    expect(runtime.hostAdapter.insertBefore).not.toHaveBeenCalled();
  });

  it('Step 4: when prev list is exhausted between stable nodes, uses rightSibling as anchor', () => {
    const prev = [el('a', 'ref:a'), el('c', 'ref:c')];
    const next = [el('a'), el('b'), el('c')];

    _patchKeyedChildren(makeFrame(prev, next, parent, runtime));

    expect(calls).toEqual([
      'patch(a -> a before right sibling b)',
      'mount(b before right sibling c)',
      'patch(c -> c before right sibling null)',
    ]);

    expect(vi.mocked(_remove)).not.toHaveBeenCalled();
    expect(runtime.hostAdapter.insertBefore).not.toHaveBeenCalled();
  });

  it('Step 5: reorder only (no mount/remove), still issues HOST_OPS_PLACE_ELEMENT_BEFORE_ANCHOR for existing nodes in reverse pass', () => {
    const prev = [el('a', 'ref:a'), el('b', 'ref:b'), el('c', 'ref:c')];
    const next = [el('b'), el('a'), el('c')];

    _patchKeyedChildren(makeFrame(prev, next, parent, runtime));

    expect(calls).toEqual([
      'placeElementBeforeAnchor(b before right sibling a)',
      'patch(b -> b before right sibling null)',
      'placeElementBeforeAnchor(a before right sibling c)',
      'patch(a -> a before right sibling null)',
      'patch(c -> c before right sibling null)',
    ]);

    expect(vi.mocked(_pushMountEnterFrame)).not.toHaveBeenCalled();
    expect(vi.mocked(_remove)).not.toHaveBeenCalled();
  });

  it('Step 5: remove-only (some prev keys not present in next)', () => {
    const prev = [el('a', 'ref:a'), el('b', 'ref:b'), el('c', 'ref:c')];
    const next = [el('a'), el('c')];

    _patchKeyedChildren(makeFrame(prev, next, parent, runtime));

    expect(calls).toEqual([
      'patch(a -> a before right sibling c)',
      'remove(b)',
      'patch(c -> c before right sibling null)',
    ]);
    expect(vi.mocked(_pushMountEnterFrame)).not.toHaveBeenCalled();
  });

  it('Step 5 mixed: patch reusable, then remove unused, then mount new, then move/insert in final order', () => {
    const prev = [el('a', 'ref:a'), el('b', 'ref:b'), el('c', 'ref:c'), el('d', 'ref:d')];
    const next = [el('d'), el('b'), el('e'), el('a')];

    _patchKeyedChildren(makeFrame(prev, next, parent, runtime));

    expect(calls).toEqual([
      'remove(c)',
      'placeElementBeforeAnchor(d before right sibling b)',
      'patch(d -> d before right sibling null)',
      'placeElementBeforeAnchor(b before right sibling e)',
      'patch(b -> b before right sibling null)',
      'mount(e before right sibling a)',
      'placeElementBeforeAnchor(a before right sibling null)',
      'patch(a -> a before right sibling null)',
    ]);
  });

  it('handles empty -> empty (no ops)', () => {
    _patchKeyedChildren(makeFrame([], [], parent, runtime));
    expect(calls).toEqual([]);
    expect(vi.mocked(_pushPatchEnterFrame)).not.toHaveBeenCalled();
    expect(vi.mocked(_pushMountEnterFrame)).not.toHaveBeenCalled();
    expect(vi.mocked(_remove)).not.toHaveBeenCalled();
    expect(runtime.hostAdapter.insertBefore).not.toHaveBeenCalled();
  });
});
