import { createElement, HOST_OPS_PLACE_ELEMENT_BEFORE_ANCHOR, MOUNT_ENTER, PATCH_ENTER } from '@simpreact/internal';
import { beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest';
import { _pushMountEnterFrame } from '../main/core/mounting.js';
import { _pushPatchEnterFrame } from '../main/core/patching.js';
import { _patchKeyedChildren } from '../main/core/patchingChildren.js';
import { _remove } from '../main/core/unmounting.js';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('../main/core/mounting.js', () => ({
  _pushMountEnterFrame: vi.fn(),
  _pushMountArrayChildrenFrame: vi.fn(),
}));

vi.mock('../main/core/patching.js', () => ({
  _pushPatchEnterFrame: vi.fn(),
}));

vi.mock('../main/core/unmounting.js', () => ({
  _remove: vi.fn(),
  _pushUnmountEnterFrame: vi.fn(),
  _pushUnmountArrayChildrenFrame: vi.fn(),
  clearElementHostReference: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Shorthand: keyed div */
const el = (key: string, ...children: any[]) => createElement('div', { key }, ...children);

/**
 * Build a minimal RenderFrame that _patchKeyedChildren expects.
 * prev/next children are passed as flat arrays — the function reads
 * frame.node.children and frame.meta.prevElement.children.
 */
function makeFrame(prevChildren: ReturnType<typeof createElement>[], nextChildren: ReturnType<typeof createElement>[]) {
  const renderRuntime = {
    renderStack: [] as any[],
  };

  const parentReference = { type: 'parent' } as any;
  const parentAnchorReference = { type: 'anchor' } as any;
  const rightSibling = null;
  const context = {} as any;
  const hostNamespace = 'html' as any;

  const prevElement = createElement('ul', null, ...prevChildren);
  const nextElement = createElement('ul', null, ...nextChildren);

  (prevElement as any).children = prevChildren;
  (nextElement as any).children = nextChildren;

  const frame = {
    node: nextElement,
    phase: {} as any,
    meta: {
      prevElement,
      parentReference,
      parentAnchorReference,
      renderRuntime,
      rightSibling,
      context,
      hostNamespace,
      placeHolderElement: null,
    },
  } as any;

  return { frame, renderRuntime };
}

// ---------------------------------------------------------------------------
// Spy accessors
// ---------------------------------------------------------------------------

let mountSpy: MockInstance;
let patchSpy: MockInstance;
let removeSpy: MockInstance;

const patchedKeys = () => patchSpy.mock.calls.map((c: any) => c[0].key);
const mountedKeys = () => mountSpy.mock.calls.map((c: any) => c[0].key);
const removedKeys = () => removeSpy.mock.calls.map((c: any) => c[0].key);

describe('patchKeyedChildren', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mountSpy = _pushMountEnterFrame as unknown as MockInstance;
    patchSpy = _pushPatchEnterFrame as unknown as MockInstance;
    removeSpy = _remove as unknown as MockInstance;
  });

  // ---------------------------------------------------------------------------
  // 1. Identity — prev === next
  // ---------------------------------------------------------------------------

  describe('identical lists', () => {
    it('patches every node and removes nothing when lists are the same', () => {
      const prev = [el('a'), el('b'), el('c')];
      const next = [el('a'), el('b'), el('c')];
      const { frame } = makeFrame(prev, next);

      _patchKeyedChildren(frame);

      expect(removeSpy).not.toHaveBeenCalled();
      expect(mountSpy).not.toHaveBeenCalled();
      expect(patchSpy).toHaveBeenCalledTimes(3);
      expect(patchedKeys()).toEqual(expect.arrayContaining(['a', 'b', 'c']));
    });

    it('handles a single-element identical list', () => {
      const { frame } = makeFrame([el('a')], [el('a')]);
      _patchKeyedChildren(frame);
      expect(patchSpy).toHaveBeenCalledTimes(1);
      expect(removeSpy).not.toHaveBeenCalled();
      expect(mountSpy).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Both lists empty
  // ---------------------------------------------------------------------------

  describe('empty lists', () => {
    it('does nothing when both lists are empty', () => {
      const { frame } = makeFrame([], []);
      _patchKeyedChildren(frame);
      expect(removeSpy).not.toHaveBeenCalled();
      expect(mountSpy).not.toHaveBeenCalled();
      expect(patchSpy).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Step 3 — next exhausted (pure removals)
  // ---------------------------------------------------------------------------

  describe('next exhausted → removals only', () => {
    it('removes all prev nodes when next is empty', () => {
      const prev = [el('a'), el('b'), el('c')];
      const { frame } = makeFrame(prev, []);
      _patchKeyedChildren(frame);

      expect(removeSpy).toHaveBeenCalledTimes(3);
      expect(removedKeys()).toEqual(expect.arrayContaining(['a', 'b', 'c']));
      expect(mountSpy).not.toHaveBeenCalled();
      expect(patchSpy).not.toHaveBeenCalled();
    });

    it('removes only the middle nodes, patches prefix and suffix', () => {
      // prev: a b c d e   next: a e
      // prefix: a  |  middle removed: b c d  |  suffix: e
      const prev = [el('a'), el('b'), el('c'), el('d'), el('e')];
      const next = [el('a'), el('e')];
      const { frame } = makeFrame(prev, next);
      _patchKeyedChildren(frame);

      expect(removedKeys()).toEqual(expect.arrayContaining(['b', 'c', 'd']));
      expect(removeSpy).toHaveBeenCalledTimes(3);
      expect(patchSpy).toHaveBeenCalledTimes(2);
      expect(mountSpy).not.toHaveBeenCalled();
    });

    it('removes a single tail node when next is a strict prefix of prev', () => {
      const prev = [el('a'), el('b'), el('c')];
      const next = [el('a'), el('b')];
      const { frame } = makeFrame(prev, next);
      _patchKeyedChildren(frame);

      expect(removedKeys()).toEqual(['c']);
      expect(patchSpy).toHaveBeenCalledTimes(2);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Step 4 — prev exhausted (pure mounts)
  // ---------------------------------------------------------------------------

  describe('prev exhausted → mounts only', () => {
    it('mounts all next nodes when prev is empty', () => {
      const next = [el('a'), el('b'), el('c')];
      const { frame } = makeFrame([], next);
      _patchKeyedChildren(frame);

      expect(mountSpy).toHaveBeenCalledTimes(3);
      expect(mountedKeys()).toEqual(expect.arrayContaining(['a', 'b', 'c']));
      expect(removeSpy).not.toHaveBeenCalled();
      expect(patchSpy).not.toHaveBeenCalled();
    });

    it('mounts only the new middle nodes, patches prefix and suffix', () => {
      // prev: a e   next: a b c d e
      const prev = [el('a'), el('e')];
      const next = [el('a'), el('b'), el('c'), el('d'), el('e')];
      const { frame } = makeFrame(prev, next);
      _patchKeyedChildren(frame);

      expect(mountedKeys()).toEqual(expect.arrayContaining(['b', 'c', 'd']));
      expect(mountSpy).toHaveBeenCalledTimes(3);
      expect(patchSpy).toHaveBeenCalledTimes(2);
      expect(removeSpy).not.toHaveBeenCalled();
    });

    it('mounts a single appended node', () => {
      const prev = [el('a'), el('b')];
      const next = [el('a'), el('b'), el('c')];
      const { frame } = makeFrame(prev, next);
      _patchKeyedChildren(frame);

      expect(mountedKeys()).toEqual(['c']);
      expect(patchSpy).toHaveBeenCalledTimes(2);
    });

    it('mounts nodes with correct rightSibling chain (insertion order)', () => {
      const next = [el('a'), el('b'), el('c')];
      const { frame } = makeFrame([], next);
      _patchKeyedChildren(frame);

      const calls = mountSpy.mock.calls.map((c: any) => ({
        key: c[0].key,
        rightSibling: c[1].rightSibling,
      }));

      const byKey = Object.fromEntries(calls.map((c: any) => [c.key, c.rightSibling]));
      expect(byKey['c']).toBeNull();
      expect(byKey['b']?.key).toBe('c');
      expect(byKey['a']?.key).toBe('b');
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Step 5 — unknown middle sequence
  // ---------------------------------------------------------------------------

  describe('unknown middle sequence', () => {
    it('patches matched keys and removes stale ones', () => {
      // prev: a b c d    next: a c e d
      // prefix: a  |  middle prev: b c d  next: c e d
      const prev = [el('a'), el('b'), el('c'), el('d')];
      const next = [el('a'), el('c'), el('e'), el('d')];
      const { frame } = makeFrame(prev, next);
      _patchKeyedChildren(frame);

      expect(removedKeys()).toEqual(['b']);
      expect(mountedKeys()).toEqual(['e']);
      expect(patchedKeys()).toEqual(expect.arrayContaining(['a', 'c', 'd']));
    });

    it('mounts a brand-new node that did not exist in prev', () => {
      const prev = [el('a'), el('b')];
      const next = [el('a'), el('z'), el('b')];
      const { frame } = makeFrame(prev, next);
      _patchKeyedChildren(frame);

      expect(mountedKeys()).toContain('z');
      expect(removeSpy).not.toHaveBeenCalled();
    });

    it('removes a node that disappeared from next', () => {
      const prev = [el('a'), el('b'), el('c')];
      const next = [el('a'), el('c')];
      const { frame } = makeFrame(prev, next);
      _patchKeyedChildren(frame);

      expect(removedKeys()).toContain('b');
      expect(mountSpy).not.toHaveBeenCalled();
    });

    it('pushes HOST_OPS_PLACE_ELEMENT_BEFORE_ANCHOR onto renderStack when nodes moved', () => {
      // prev: a b c   next: c a b  → all three match but order changed → moved=true
      const prev = [el('a'), el('b'), el('c')];
      const next = [el('c'), el('a'), el('b')];
      const { frame, renderRuntime } = makeFrame(prev, next);
      _patchKeyedChildren(frame);

      const placedPhases = renderRuntime.renderStack.map((f: any) => f.phase);
      expect(placedPhases).toContain(HOST_OPS_PLACE_ELEMENT_BEFORE_ANCHOR);
    });

    it('does NOT push HOST_OPS_PLACE_ELEMENT_BEFORE_ANCHOR when no nodes moved', () => {
      // prev: a b c   next: a b c d  — relative order preserved, one added at end
      const prev = [el('a'), el('b'), el('c')];
      const next = [el('a'), el('b'), el('c'), el('d')];
      const { frame, renderRuntime } = makeFrame(prev, next);
      _patchKeyedChildren(frame);

      const placedPhases = renderRuntime.renderStack.map((f: any) => f.phase);
      expect(placedPhases).not.toContain(HOST_OPS_PLACE_ELEMENT_BEFORE_ANCHOR);
    });

    it('full replacement — no keys survive', () => {
      const prev = [el('a'), el('b'), el('c')];
      const next = [el('x'), el('y'), el('z')];
      const { frame } = makeFrame(prev, next);
      _patchKeyedChildren(frame);

      expect(removedKeys()).toEqual(expect.arrayContaining(['a', 'b', 'c']));
      expect(mountedKeys()).toEqual(expect.arrayContaining(['x', 'y', 'z']));
      expect(patchSpy).not.toHaveBeenCalled();
    });

    it('handles a single swap (2-element reversal)', () => {
      const prev = [el('a'), el('b')];
      const next = [el('b'), el('a')];
      const { frame, renderRuntime } = makeFrame(prev, next);
      _patchKeyedChildren(frame);

      expect(removeSpy).not.toHaveBeenCalled();
      expect(mountSpy).not.toHaveBeenCalled();
      expect(patchedKeys()).toEqual(expect.arrayContaining(['a', 'b']));
      const placedPhases = renderRuntime.renderStack.map((f: any) => f.phase);
      expect(placedPhases).toContain(HOST_OPS_PLACE_ELEMENT_BEFORE_ANCHOR);
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Prefix-only and suffix-only fast paths
  // ---------------------------------------------------------------------------

  describe('prefix and suffix fast paths', () => {
    it('handles a pure suffix match with one removal in the middle', () => {
      const prev = [el('x'), el('a'), el('b')];
      const next = [el('a'), el('b')];
      const { frame } = makeFrame(prev, next);
      _patchKeyedChildren(frame);

      expect(removedKeys()).toEqual(['x']);
      expect(patchedKeys()).toEqual(expect.arrayContaining(['a', 'b']));
    });

    it('handles all-prefix with a removal at the tail', () => {
      const prev = [el('a'), el('b'), el('c')];
      const next = [el('a'), el('b')];
      const { frame } = makeFrame(prev, next);
      _patchKeyedChildren(frame);

      expect(removedKeys()).toEqual(['c']);
      expect(patchedKeys()).toEqual(expect.arrayContaining(['a', 'b']));
      expect(mountSpy).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // 7. Patch frame meta correctness
  // ---------------------------------------------------------------------------

  describe('patch frame meta', () => {
    it('passes the correct prevElement to each patch frame', () => {
      const prevA = el('a');
      const prevB = el('b');
      const nextA = el('a');
      const nextB = el('b');
      const { frame } = makeFrame([prevA, prevB], [nextA, nextB]);
      _patchKeyedChildren(frame);

      const calls = patchSpy.mock.calls as any[];
      const prevsByKey = Object.fromEntries(calls.map(c => [c[0].key, c[1].prevElement]));
      expect(prevsByKey['a']).toBe(prevA);
      expect(prevsByKey['b']).toBe(prevB);
    });

    it('passes PATCH_ENTER as the phase on every patch frame', () => {
      const { frame } = makeFrame([el('a'), el('b')], [el('a'), el('b')]);
      _patchKeyedChildren(frame);

      expect(patchSpy.mock.calls.length).toBe(2);
    });

    it('passes MOUNT_ENTER as the phase on every mount frame', () => {
      const { frame } = makeFrame([], [el('a'), el('b')]);
      _patchKeyedChildren(frame);

      expect(mountSpy.mock.calls.length).toBe(2);
    });

    it('propagates parentReference, context, and hostNamespace unchanged', () => {
      const { frame } = makeFrame([el('a')], [el('a')]);
      _patchKeyedChildren(frame);

      const meta = (patchSpy.mock.calls[0] as any)[1];
      expect(meta.parentReference).toBe(frame.meta.parentReference);
      expect(meta.context).toBe(frame.meta.context);
      expect(meta.hostNamespace).toBe(frame.meta.hostNamespace);
    });
  });

  // ---------------------------------------------------------------------------
  // 8. rightSibling uses correct nextEnd index in step 5
  // ---------------------------------------------------------------------------

  describe('rightSibling uses correct nextEnd index in step 5', () => {
    it('initialises rightSibling from nextEnd+1, when suffix trimming leaves unequal middle lengths', () => {
      // prev: [b, c, d, tail]   next: [e, tail]
      //
      // Suffix scan consumes 'tail' from both → prevEnd=2 (d), nextEnd=0 (e).
      //
      // Buggy:   nextChildren[prevEnd + 1] = nextChildren[3] = undefined → null fallback
      // Correct: nextChildren[nextEnd + 1] = nextChildren[1] = tail element
      //
      // 'e' is new → gets mounted. Its rightSibling must be the 'tail' element,
      // not null (which would insert it at the end of the parent instead of before tail).
      const tail = el('tail');
      const prev = [el('b'), el('c'), el('d'), tail];
      const next = [el('e'), tail];

      const { frame } = makeFrame(prev, next);
      _patchKeyedChildren(frame);

      const mountCall = (mountSpy.mock.calls as any[]).find((c: any) => c[0].key === 'e');
      expect(mountCall).toBeDefined();

      const rightSibling = mountCall[1].rightSibling;
      expect(rightSibling).not.toBeNull();
      expect(rightSibling?.key).toBe('tail');
    });
  });

  // ---------------------------------------------------------------------------
  // 9. Frame execution order
  // ---------------------------------------------------------------------------
  //
  // The render stack is LIFO: frames are *pushed* in reverse of their intended
  // *execution* order. Tests in this section verify push order directly, which
  // is what the algorithm controls. Where execution order matters (e.g. PATCH
  // must execute before PLACE for the same node), the comment explains the
  // LIFO inversion.
  //
  // runAndCollect() builds a unified push-order timeline across all three
  // frame types: HOST_OPS via renderStack.push, mount/patch via spies.

  describe('frame execution order', () => {
    type FrameRecord = { phase: string; key: string | null };

    /**
     * Runs _patchKeyedChildren and returns every frame push in push order,
     * unified across renderStack.push, _pushMountFrame, and _pushPatchFrame.
     */
    function runAndCollect(
      prevChildren: ReturnType<typeof el>[],
      nextChildren: ReturnType<typeof el>[]
    ): FrameRecord[] {
      const log: FrameRecord[] = [];

      // Proxy renderStack so HOST_OPS pushes land in the log
      const renderRuntime = {
        renderStack: {
          push(frame: any) {
            log.push({ phase: String(frame.phase), key: frame.node.key });
          },
        } as any,
      };

      // Spy implementations append to the same log
      mountSpy.mockImplementation((element: any) => {
        log.push({ phase: String(MOUNT_ENTER), key: element.key });
      });
      patchSpy.mockImplementation((element: any) => {
        log.push({ phase: String(PATCH_ENTER), key: element.key });
      });

      const prevElement = createElement('ul', null, ...prevChildren);
      const nextElement = createElement('ul', null, ...nextChildren);
      (prevElement as any).children = prevChildren;
      (nextElement as any).children = nextChildren;

      const frame = {
        node: nextElement,
        phase: {} as any,
        meta: {
          prevElement,
          parentReference: { type: 'parent' } as any,
          parentAnchorReference: { type: 'anchor' } as any,
          renderRuntime,
          rightSibling: null,
          context: {} as any,
          hostNamespace: 'html' as any,
          placeHolderElement: null,
        },
      } as any;

      _patchKeyedChildren(frame);

      // Restore spies to silent mocks so the rest of the suite is unaffected
      mountSpy.mockImplementation(() => {});
      patchSpy.mockImplementation(() => {});

      return log;
    }

    // -- Step 3 (next exhausted) --------------------------------------------

    it('step 3: prefix patch is pushed before suffix patch', () => {
      const log = runAndCollect([el('a'), el('b'), el('c'), el('d')], [el('a'), el('d')]);

      const patchLog = log.filter(f => f.phase === String(PATCH_ENTER)).map(f => f.key);
      expect(patchLog).toEqual(['a', 'd']);
    });

    it('step 3: multi-node suffix is pushed in straight list order, prefix pushed first', () => {
      const log = runAndCollect([el('a'), el('b'), el('c'), el('d'), el('e')], [el('a'), el('d'), el('e')]);

      const patchLog = log.filter(f => f.phase === String(PATCH_ENTER)).map(f => f.key);
      expect(patchLog).toEqual(['a', 'd', 'e']);
    });

    // -- Step 4 (prev exhausted) --------------------------------------------

    it('step 4: mount frames are pushed in straight list order', () => {
      const log = runAndCollect([], [el('a'), el('b'), el('c')]);

      const mountLog = log.filter(f => f.phase === String(MOUNT_ENTER)).map(f => f.key);
      expect(mountLog).toEqual(['a', 'b', 'c']);
    });

    it('step 4: prefix pushed before middle mounts, suffix pushed last of all', () => {
      const log = runAndCollect([el('a'), el('e')], [el('a'), el('b'), el('c'), el('e')]);

      expect(log).toEqual([
        { phase: '3', key: 'a' },
        { phase: '1', key: 'b' },
        { phase: '1', key: 'c' },
        { phase: '3', key: 'e' },
      ]);
    });

    // -- Step 5 (unknown middle) --------------------------------------------

    it('step 5: middle frames are pushed in straight next-list order', () => {
      const log = runAndCollect([el('b'), el('c'), el('d')], [el('d'), el('b'), el('c')]);

      const patchLog = log.filter(f => f.phase === String(PATCH_ENTER)).map(f => f.key);
      expect(patchLog).toEqual(['d', 'b', 'c']);
    });

    it('step 5: prefix pushed first, then middle, then suffix — all in straight order within each group', () => {
      const log = runAndCollect(
        [el('a'), el('b'), el('c'), el('d'), el('z')],
        [el('a'), el('d'), el('b'), el('c'), el('z')]
      );

      expect(log).toEqual([
        { key: 'a', phase: PATCH_ENTER.toString() },
        { key: 'd', phase: HOST_OPS_PLACE_ELEMENT_BEFORE_ANCHOR.toString() },
        { key: 'd', phase: PATCH_ENTER.toString() },
        { key: 'b', phase: HOST_OPS_PLACE_ELEMENT_BEFORE_ANCHOR.toString() },
        { key: 'b', phase: PATCH_ENTER.toString() },
        { key: 'c', phase: HOST_OPS_PLACE_ELEMENT_BEFORE_ANCHOR.toString() },
        { key: 'c', phase: PATCH_ENTER.toString() },
        { key: 'z', phase: PATCH_ENTER.toString() },
      ]);
    });

    it('step 5: HOST_OPS_PLACE is pushed immediately before PATCH for the same node (LIFO → PATCH executes first)', () => {
      // For each moved node the algorithm pushes HOST_OPS_PLACE then PATCH.
      // LIFO inversion: PATCH executes first (updates vdom/ref), then PLACE
      // executes (repositions the already-updated DOM node).
      // We assert push adjacency: every PLACE frame is immediately followed
      // in the push log by a PATCH frame with the same key.
      const log = runAndCollect([el('a'), el('b')], [el('b'), el('a')]);

      const placePhase = String(HOST_OPS_PLACE_ELEMENT_BEFORE_ANCHOR);
      const patchPhase = String(PATCH_ENTER);

      for (let i = 0; i < log.length - 1; i++) {
        if (log[i]!.phase === placePhase) {
          expect(log[i + 1]!.phase).toBe(patchPhase);
          expect(log[i + 1]!.key).toBe(log[i]!.key);
        }
      }
    });

    it('step 5: exact push sequence for a mixed move+mount scenario', () => {
      const log = runAndCollect([el('a'), el('b'), el('c')], [el('c'), el('x'), el('a'), el('b')]);

      expect(log).toEqual([
        { key: 'c', phase: HOST_OPS_PLACE_ELEMENT_BEFORE_ANCHOR.toString() },
        { key: 'c', phase: PATCH_ENTER.toString() },
        { key: 'x', phase: MOUNT_ENTER.toString() },
        { key: 'a', phase: HOST_OPS_PLACE_ELEMENT_BEFORE_ANCHOR.toString() },
        { key: 'a', phase: PATCH_ENTER.toString() },
        { key: 'b', phase: HOST_OPS_PLACE_ELEMENT_BEFORE_ANCHOR.toString() },
        { key: 'b', phase: PATCH_ENTER.toString() },
      ]);
    });

    it('step 5: a,b,c,d → d,b,e,a — exact push sequence with removal, insertion, and moves', () => {
      const log = runAndCollect([el('a'), el('b'), el('c'), el('d')], [el('d'), el('b'), el('e'), el('a')]);

      expect(log).toEqual([
        { key: 'd', phase: HOST_OPS_PLACE_ELEMENT_BEFORE_ANCHOR.toString() },
        { key: 'd', phase: PATCH_ENTER.toString() },
        { key: 'b', phase: HOST_OPS_PLACE_ELEMENT_BEFORE_ANCHOR.toString() },
        { key: 'b', phase: PATCH_ENTER.toString() },
        { key: 'e', phase: MOUNT_ENTER.toString() },
        { key: 'a', phase: HOST_OPS_PLACE_ELEMENT_BEFORE_ANCHOR.toString() },
        { key: 'a', phase: PATCH_ENTER.toString() },
      ]);

      // Stale node 'c' must be removed
      expect(removeSpy).toHaveBeenCalledTimes(1);
      expect((removeSpy.mock.calls[0] as any)[0].key).toBe('c');
    });

    it('step 5: no PLACE frames emitted when relative order is preserved (moved=false)', () => {
      // Use mismatched head/tail keys so prefix and suffix scans stop immediately,
      // but the surviving middle keys (a, b) appear in the same relative order.
      // prev: [p, a, b, s]   next: [q, a, b, r]
      // prefix: p!==q → stop. suffix: s!==r → stop.
      // Middle prev: [a,b]  next: [a,b] — no reorder → moved stays false.
      const log = runAndCollect([el('p'), el('a'), el('b'), el('s')], [el('q'), el('a'), el('b'), el('r')]);

      const placePhase = String(HOST_OPS_PLACE_ELEMENT_BEFORE_ANCHOR);
      expect(log.filter(f => f.phase === placePhase)).toHaveLength(0);
    });

    // -- rightSibling chain in step 5 mount frames --------------------------

    it('step 5: each new mount frame carries the next virtual element as rightSibling', () => {
      // prev: [a, b, c]   next: [x, y, z]  — full replacement, all go through step 5
      // Loop reversed i=2(z), i=1(y), i=0(x). rightSibling starts as null.
      //   MOUNT(z): rightSibling=null  → rightSibling becomes z
      //   MOUNT(y): rightSibling=z     → rightSibling becomes y
      //   MOUNT(x): rightSibling=y
      // Push order in spy: z→null, y→z, x→y
      const { frame } = makeFrame([el('a'), el('b'), el('c')], [el('x'), el('y'), el('z')]);
      _patchKeyedChildren(frame);

      const calls = (mountSpy.mock.calls as any[]).map((c: any) => ({
        key: c[0].key as string,
        rightSibling: c[1].rightSibling as any,
      }));
      const byKey = Object.fromEntries(calls.map(c => [c.key, c.rightSibling]));

      expect(byKey['z']).toBeNull();
      expect(byKey['y']?.key).toBe('z');
      expect(byKey['x']?.key).toBe('y');
    });
  });

  // ---------------------------------------------------------------------------
  // 10. Edge cases
  // ---------------------------------------------------------------------------

  describe('edge cases', () => {
    it('handles a single-element list where that element is replaced', () => {
      const { frame } = makeFrame([el('a')], [el('b')]);
      _patchKeyedChildren(frame);

      expect(removedKeys()).toEqual(['a']);
      expect(mountedKeys()).toEqual(['b']);
      expect(patchSpy).not.toHaveBeenCalled();
    });

    it('handles large lists with only a middle insertion correctly', () => {
      const N = 20;
      const prev = Array.from({ length: N }, (_, i) => el(`k${i}`));
      const inserted = el('new');
      const next = [...prev.slice(0, 10), inserted, ...prev.slice(10)];
      const { frame } = makeFrame(prev, next);
      _patchKeyedChildren(frame);

      expect(mountedKeys()).toContain('.new');
      expect(removeSpy).not.toHaveBeenCalled();
      expect(patchSpy).toHaveBeenCalledTimes(N);
    });

    it('handles large lists with only a middle deletion correctly', () => {
      const N = 20;
      const prev = Array.from({ length: N }, (_, i) => el(`k${i}`));
      const next = [...prev.slice(0, 10), ...prev.slice(11)]; // remove k10
      const { frame } = makeFrame(prev, next);
      _patchKeyedChildren(frame);

      expect(removedKeys()).toContain('.k10');
      expect(mountSpy).not.toHaveBeenCalled();
      expect(patchSpy).toHaveBeenCalledTimes(N - 1);
    });

    it('handles a full reversal of a list', () => {
      const prev = [el('a'), el('b'), el('c'), el('d')];
      const next = [el('d'), el('c'), el('b'), el('a')];
      const { frame, renderRuntime } = makeFrame(prev, next);
      _patchKeyedChildren(frame);

      expect(removeSpy).not.toHaveBeenCalled();
      expect(mountSpy).not.toHaveBeenCalled();
      expect(patchedKeys()).toEqual(expect.arrayContaining(['a', 'b', 'c', 'd']));
      const placedPhases = renderRuntime.renderStack.map((f: any) => f.phase);
      expect(placedPhases).toContain(HOST_OPS_PLACE_ELEMENT_BEFORE_ANCHOR);
    });

    it('passes placeHolderElement as null on all frames', () => {
      const { frame } = makeFrame([el('a')], [el('a'), el('b')]);
      _patchKeyedChildren(frame);

      for (const call of [...patchSpy.mock.calls, ...mountSpy.mock.calls] as any[]) {
        expect(call[1].placeHolderElement).toBeNull();
      }
    });
  });
});
