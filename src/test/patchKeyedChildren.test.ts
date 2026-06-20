import { SIMP_ELEMENT_FLAG_HOST } from '@simpreact/internal';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { _pushHostOperationPlaceElement } from '../main/core/hostOperations.js';
import { _pushMountEnterFrame } from '../main/core/mounting.js';
import { _pushPatchEnterFrame } from '../main/core/patching.js';
import { _patchKeyedChildren } from '../main/core/patchingChildren.js';
import { _clearElementHostReference, findHostReferenceFromElement } from '../main/core/utils.js';

vi.mock('../main/core/patching.js', () => ({ _pushPatchEnterFrame: vi.fn() }));
vi.mock('../main/core/mounting.js', () => ({ _pushMountEnterFrame: vi.fn() }));
vi.mock('../main/core/utils.js', async importOriginal => ({
  ...(await importOriginal()),
  findHostReferenceFromElement: vi.fn(),
  _clearElementHostReference: vi.fn(),
}));
vi.mock('../main/core/hostOperations.js', () => ({ _pushHostOperationPlaceElement: vi.fn() }));

type HostReference = { id: string };
type Key = string;

type SimpElement = {
  key: Key;
  flag: number;
  index: number;
  reference?: HostReference;
};

type SimpRenderRuntime = {
  renderStack: any[];
  hostAdapter: {
    insertBefore: (parent: HostReference, node: HostReference, before: HostReference) => void;
  };
};

function el(key: string, ref: string | undefined, index: number): SimpElement {
  return { key, flag: SIMP_ELEMENT_FLAG_HOST, reference: ref ? { id: ref } : undefined, index };
}

function ref(id: string): HostReference {
  return { id };
}

function makeFrame(
  prev: SimpElement[],
  next: SimpElement[],
  parent: HostReference,
  runtime: SimpRenderRuntime
): { node: any; meta: any } {
  return {
    node: { children: next } as any,
    meta: {
      prevParentElement: { children: prev } as any,
      parentReference: parent,
      subtreeRightBoundary: null,
      context: null,
      hostNamespace: undefined,
      renderRuntime: runtime as any,
      prevChildren: prev as any,
      nextChildren: next as any,
      nextParentChildFlag: -1,
      prevParentChildFlag: -1,
    },
  };
}
function callPatchKeyed(
  prev: SimpElement[],
  next: SimpElement[],
  parent: HostReference,
  runtime: SimpRenderRuntime
): void {
  const { node, meta } = makeFrame(prev, next, parent, runtime);
  _patchKeyedChildren(node, meta);
}

describe('patchKeyedChildren', () => {
  const parent = ref('PARENT');

  let calls: string[];
  let runtime: SimpRenderRuntime;

  beforeEach(() => {
    vi.clearAllMocks();

    calls = [];

    runtime = {
      renderStack: [],
      hostAdapter: {
        insertBefore: vi.fn((_p, node, before) => {
          calls.push(`insertBefore(${node.id} -> ${before.id})`);
        }),
      },
    };

    vi.mocked(_pushPatchEnterFrame).mockImplementation(
      (element, _rt, prevElement, _parentRef, subtreeRightBoundary) => {
        element.reference = prevElement.reference;
        calls.push(
          `patch(${prevElement.key} -> ${element.key} before right sibling ${subtreeRightBoundary?.key || 'null'})`
        );
      }
    );

    vi.mocked(_clearElementHostReference).mockImplementation(prev => {
      calls.push(`remove(${prev!.key})`);
    });

    vi.mocked(_pushMountEnterFrame).mockImplementation((element, _rt, _parentRef, subtreeRightBoundary) => {
      element.reference = { id: `ref:${element.key}` };
      calls.push(`mount(${element.key} before right sibling ${subtreeRightBoundary?.key || 'null'})`);
    });

    vi.mocked(_pushHostOperationPlaceElement).mockImplementation((element, _rt, _parentRef, subtreeRightBoundary) => {
      calls.push(
        `placeElementBeforeAnchor(${element.key} before right sibling ${subtreeRightBoundary?.key || 'null'})`
      );
    });

    vi.mocked(findHostReferenceFromElement).mockImplementation(node => {
      return node?.reference || null;
    });
  });

  it('Step 1: syncs from start while keys match', () => {
    const prev = [el('a', 'ref:a', 0), el('b', 'ref:b', 1), el('c', 'ref:c', 2)];
    const next = [el('a', undefined, 0), el('b', undefined, 1), el('x', undefined, 2)];

    callPatchKeyed(prev, next, parent, runtime);

    expect(calls).toEqual([
      'patch(a -> a before right sibling b)',
      'patch(b -> b before right sibling x)',
      'remove(c)',
      'mount(x before right sibling null)',
    ]);
  });

  it('Step 2: syncs from end while keys match', () => {
    const prev = [el('a', 'ref:a', 0), el('b', 'ref:b', 1), el('c', 'ref:c', 2)];
    const next = [el('x', undefined, 0), el('b', undefined, 1), el('c', undefined, 2)];

    callPatchKeyed(prev, next, parent, runtime);

    expect(calls).toEqual([
      'remove(a)',
      'mount(x before right sibling b)',
      'patch(b -> b before right sibling c)',
      'patch(c -> c before right sibling null)',
    ]);
  });

  it('Step 3: when next list is exhausted, removes remaining prev (after start sync patches)', () => {
    const prev = [el('a', 'ref:a', 0), el('b', 'ref:b', 1)];
    const next = [el('a', undefined, 0)];

    callPatchKeyed(prev, next, parent, runtime);

    expect(calls).toEqual(['patch(a -> a before right sibling null)', 'remove(b)']);

    expect(vi.mocked(_pushMountEnterFrame)).not.toHaveBeenCalled();
    expect(runtime.hostAdapter.insertBefore).not.toHaveBeenCalled();
  });

  it('Step 4: when prev list is exhausted (no stable right sibling), mounts all next using rightSibling as anchor', () => {
    const next = [el('a', undefined, 0), el('b', undefined, 1)];

    callPatchKeyed([], next, parent, runtime);

    expect(calls).toEqual(['mount(a before right sibling b)', 'mount(b before right sibling null)']);

    expect(vi.mocked(_pushPatchEnterFrame)).not.toHaveBeenCalled();
    expect(vi.mocked(_clearElementHostReference)).not.toHaveBeenCalled();
    expect(vi.mocked(findHostReferenceFromElement)).not.toHaveBeenCalled();
    expect(runtime.hostAdapter.insertBefore).not.toHaveBeenCalled();
  });

  it('Step 4: when prev list is exhausted between stable nodes, uses rightSibling as anchor', () => {
    const prev = [el('a', 'ref:a', 0), el('c', 'ref:c', 1)];
    const next = [el('a', undefined, 0), el('b', undefined, 1), el('c', undefined, 2)];

    callPatchKeyed(prev, next, parent, runtime);

    expect(calls).toEqual([
      'patch(a -> a before right sibling b)',
      'mount(b before right sibling c)',
      'patch(c -> c before right sibling null)',
    ]);

    expect(vi.mocked(_clearElementHostReference)).not.toHaveBeenCalled();
    expect(runtime.hostAdapter.insertBefore).not.toHaveBeenCalled();
  });

  it('Step 5: reorder only (no mount/remove), moves only nodes outside the LIS', () => {
    const prev = [el('a', 'ref:a', 0), el('b', 'ref:b', 1), el('c', 'ref:c', 2)];
    const next = [el('b', undefined, 0), el('a', undefined, 1), el('c', undefined, 2)];

    callPatchKeyed(prev, next, parent, runtime);

    expect(calls).toEqual([
      'placeElementBeforeAnchor(b before right sibling a)',
      'patch(b -> b before right sibling null)',
      'patch(a -> a before right sibling null)',
      'patch(c -> c before right sibling null)',
    ]);

    expect(vi.mocked(_pushMountEnterFrame)).not.toHaveBeenCalled();
    expect(vi.mocked(_clearElementHostReference)).not.toHaveBeenCalled();
  });

  it('Step 5: remove-only (some prev keys not present in next)', () => {
    const prev = [el('a', 'ref:a', 0), el('b', 'ref:b', 1), el('c', 'ref:c', 2)];
    const next = [el('a', undefined, 0), el('c', undefined, 1)];

    callPatchKeyed(prev, next, parent, runtime);

    expect(calls).toEqual([
      'patch(a -> a before right sibling c)',
      'remove(b)',
      'patch(c -> c before right sibling null)',
    ]);
    expect(vi.mocked(_pushMountEnterFrame)).not.toHaveBeenCalled();
  });

  it('Step 5 mixed: patch reusable, then remove unused, then mount new, then move/insert in final order', () => {
    const prev = [el('a', 'ref:a', 0), el('b', 'ref:b', 1), el('c', 'ref:c', 2), el('d', 'ref:d', 3)];
    const next = [el('d', undefined, 0), el('b', undefined, 1), el('e', undefined, 2), el('a', undefined, 3)];

    callPatchKeyed(prev, next, parent, runtime);

    expect(calls).toEqual([
      'remove(c)',
      'placeElementBeforeAnchor(d before right sibling b)',
      'patch(d -> d before right sibling null)',
      'placeElementBeforeAnchor(b before right sibling e)',
      'patch(b -> b before right sibling null)',
      'mount(e before right sibling a)',
      'patch(a -> a before right sibling null)',
    ]);
  });

  it('handles empty -> empty (no ops)', () => {
    callPatchKeyed([], [], parent, runtime);
    expect(calls).toEqual([]);
    expect(vi.mocked(_pushPatchEnterFrame)).not.toHaveBeenCalled();
    expect(vi.mocked(_pushMountEnterFrame)).not.toHaveBeenCalled();
    expect(vi.mocked(_clearElementHostReference)).not.toHaveBeenCalled();
    expect(runtime.hostAdapter.insertBefore).not.toHaveBeenCalled();
  });
});
