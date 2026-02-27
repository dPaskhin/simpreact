import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SIMP_ELEMENT_FLAG_HOST } from '../main/core/createElement.js';
import { mount } from '../main/core/mounting.js';
import { patch } from '../main/core/patching.js';
import { patchKeyedChildren } from '../main/core/patchingChildren.js';
import { remove } from '../main/core/unmounting.js';
import { findHostReferenceFromElement } from '../main/core/utils.js';

vi.mock('../main/core/patching.js', () => ({ patch: vi.fn() }));
vi.mock('../main/core/mounting.js', () => ({ mount: vi.fn() }));
vi.mock('../main/core/unmounting.js', () => ({ remove: vi.fn() }));
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

    vi.mocked(patch).mockImplementation((prev, next) => {
      next.reference = prev.reference;
      calls.push(`patch(${prev.key} -> ${next.key})`);
    });

    vi.mocked(remove).mockImplementation(prev => {
      calls.push(`remove(${prev.key})`);
    });

    vi.mocked(mount).mockImplementation((element, _parentReference, nextReference: any) => {
      element.reference = { id: `ref:${element.key}` };
      calls.push(`mount(${element.key} before ${nextReference.id})`);
    });

    vi.mocked(findHostReferenceFromElement).mockImplementation(node => {
      return node?.reference || null;
    });
  });

  it('Step 1: syncs from start while keys match', () => {
    const prev = [el('a', 'ref:a'), el('b', 'ref:b'), el('c', 'ref:c')];
    const next = [el('a'), el('b'), el('x')];

    patchKeyedChildren(prev as any, next as any, parent as any, nextRef as any, null, null, runtime as any);

    // a,b patched in Step1; then Step5 handles c->remove and x->mount
    expect(calls).toContain('patch(a -> a)');
    expect(calls).toContain('patch(b -> b)');
    expect(calls).toContain('remove(c)');
    expect(calls).toContain('mount(x before NEXT_REF)');
  });

  it('Step 2: syncs from end while keys match', () => {
    const prev = [el('a', 'ref:a'), el('b', 'ref:b'), el('c', 'ref:c')];
    const next = [el('x'), el('b'), el('c')];

    patchKeyedChildren(prev as any, next as any, parent as any, nextRef as any, null, null, runtime as any);

    // end sync patches c then b
    expect(calls[0]).toBe('patch(c -> c)');
    expect(calls[1]).toBe('patch(b -> b)');

    // then Step5 should remove a and mount x
    expect(calls).toContain('remove(a)');
    expect(calls).toContain('mount(x before ref:b)'); // anchor is b's ref in reverse placement
  });

  it('Step 3: when next list is exhausted, removes remaining prev (after start sync patches)', () => {
    const prev = [el('a', 'ref:a'), el('b', 'ref:b')];
    const next = [el('a')];

    patchKeyedChildren(prev as any, next as any, parent as any, nextRef as any, null, null, runtime as any);

    expect(calls).toEqual([
      'patch(a -> a)', // start sync
      'remove(b)', // next exhausted
    ]);

    expect(vi.mocked(mount)).not.toHaveBeenCalled();
    expect(runtime.hostAdapter.insertBefore).not.toHaveBeenCalled();
  });

  it('Step 4: when prev list is exhausted (no stable right sibling), mounts all next using nextRef as anchor', () => {
    const next = [el('a'), el('b')];

    patchKeyedChildren([] as any, next as any, parent as any, nextRef as any, null, null, runtime as any);

    // before is computed once and stays constant in Step 4
    expect(calls).toEqual(['mount(a before NEXT_REF)', 'mount(b before NEXT_REF)']);

    expect(vi.mocked(patch)).not.toHaveBeenCalled();
    expect(vi.mocked(remove)).not.toHaveBeenCalled();
    expect(vi.mocked(findHostReferenceFromElement)).not.toHaveBeenCalled();
    expect(runtime.hostAdapter.insertBefore).not.toHaveBeenCalled();
  });

  it('Step 4: when prev list is exhausted between stable nodes, uses findHostReferenceFromElement(rightSibling) as anchor', () => {
    const prev = [el('a', 'ref:a'), el('c', 'ref:c')];
    const next = [el('a'), el('b'), el('c')];

    patchKeyedChildren(prev as any, next as any, parent as any, nextRef as any, null, null, runtime as any);

    // Step 1 patches "a"; Step 2 patches c; Step 4 mounts b before the stable right sibling (c)
    expect(calls).toEqual(['patch(a -> a)', 'patch(c -> c)', 'mount(b before ref:c)']);

    // Anchor must be computed from the right sibling in the next list (the already-patched `c`)
    expect(vi.mocked(findHostReferenceFromElement)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(findHostReferenceFromElement)).toHaveBeenCalledWith((next as any)[2]);

    expect(vi.mocked(remove)).not.toHaveBeenCalled();
    expect(runtime.hostAdapter.insertBefore).not.toHaveBeenCalled();
  });

  it('Step 5: reorder only (no mount/remove), still issues insertBefore for existing nodes in reverse pass', () => {
    const prev = [el('a', 'ref:a'), el('b', 'ref:b'), el('c', 'ref:c')];
    const next = [el('b'), el('a'), el('c')];

    patchKeyedChildren(prev as any, next as any, parent as any, nextRef as any, null, null, runtime as any);

    // end sync patches c
    // step5 patches b,a
    expect(calls).toContain('patch(c -> c)');
    expect(calls).toContain('patch(b -> b)');
    expect(calls).toContain('patch(a -> a)');

    expect(vi.mocked(mount)).not.toHaveBeenCalled();
    expect(vi.mocked(remove)).not.toHaveBeenCalled();

    // placement pass (reverse):
    // i=a -> insertBefore(ref:a -> ref:c)
    // i=b -> insertBefore(ref:b -> ref:a)
    expect(calls).toContain('insertBefore(ref:a -> ref:c)');
    expect(calls).toContain('insertBefore(ref:b -> ref:a)');
  });

  it('Step 5: remove-only (some prev keys not present in next)', () => {
    const prev = [el('a', 'ref:a'), el('b', 'ref:b'), el('c', 'ref:c')];
    const next = [el('a'), el('c')];

    patchKeyedChildren(prev as any, next as any, parent as any, nextRef as any, null, null, runtime as any);

    // start sync patches "a", end sync patches "c", then remove "b" (Step 3 or Step 5 depending on pointers)
    expect(calls).toEqual(['patch(a -> a)', 'patch(c -> c)', 'remove(b)']);
    expect(vi.mocked(mount)).not.toHaveBeenCalled();
  });

  it('Step 5 mixed: patch reusable, then remove unused, then mount new, then move/insert in final order', () => {
    const prev = [el('a', 'ref:a'), el('b', 'ref:b'), el('c', 'ref:c'), el('d', 'ref:d')];
    const next = [el('d'), el('b'), el('e'), el('a')];

    patchKeyedChildren(prev as any, next as any, parent as any, nextRef as any, null, null, runtime as any);

    // Critical ordering: all patches happen before any remove; all removes happen before any mount.
    const firstRemoveIdx = calls.findIndex(c => c.startsWith('remove('));
    const lastPatchIdx = Math.max(
      calls.findLastIndex(c => c.startsWith('patch(')),
      calls.findLastIndex(c => c.startsWith('patch(')) // (kept explicit)
    );
    const firstMountIdx = calls.findIndex(c => c.startsWith('mount('));

    expect(lastPatchIdx).toBeGreaterThanOrEqual(0);
    expect(firstRemoveIdx).toBeGreaterThanOrEqual(0);
    expect(firstMountIdx).toBeGreaterThanOrEqual(0);

    expect(lastPatchIdx).toBeLessThan(firstRemoveIdx);
    expect(firstRemoveIdx).toBeLessThan(firstMountIdx);

    // Patches for reused keys: d,b,a (order depends on sync and scan, so assert presence)
    expect(calls).toContain('patch(d -> d)');
    expect(calls).toContain('patch(b -> b)');
    expect(calls).toContain('patch(a -> a)');

    // c must be removed
    expect(calls).toContain('remove(c)');

    // e must be mounted (and only after removals)
    expect(calls).toContain('mount(e before ref:a)'); // in reverse placement, anchor at 'a'

    // placement pass: reverse order over next: a, e, b, d
    // "a" existing -> insertBefore(ref:a -> NEXT_REF)
    // e new -> mount before ref:a (creates ref:e)
    // b existing -> insertBefore(ref:b -> ref:e)
    // d existing   -> insertBefore(ref:d -> ref:b)
    expect(calls).toContain('insertBefore(ref:a -> NEXT_REF)');
    expect(calls).toContain('insertBefore(ref:b -> ref:e)');
    expect(calls).toContain('insertBefore(ref:d -> ref:b)');
  });

  it('handles empty -> empty (no ops)', () => {
    patchKeyedChildren([] as any, [] as any, parent as any, nextRef as any, null, null, runtime as any);
    expect(calls).toEqual([]);
    expect(vi.mocked(patch)).not.toHaveBeenCalled();
    expect(vi.mocked(mount)).not.toHaveBeenCalled();
    expect(vi.mocked(remove)).not.toHaveBeenCalled();
    expect(runtime.hostAdapter.insertBefore).not.toHaveBeenCalled();
  });
});
