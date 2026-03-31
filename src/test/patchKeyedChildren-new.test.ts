import { createElement, HOST_OPS_PLACE_ELEMENT_BEFORE_ANCHOR, MOUNT_ENTER, PATCH_ENTER } from '@simpreact/internal';
import { beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest';
import { _pushMountFrame } from '../main/core/mounting.js';
import { _pushPatchFrame } from '../main/core/patching.js';
import { _patchKeyedChildren } from '../main/core/patchingChildren.js';
import { _remove } from '../main/core/unmounting.js';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('../main/core/mounting.js', () => ({
  _pushMountFrame: vi.fn(),
  _pushMountArrayChildrenFrame: vi.fn(),
}));

vi.mock('../main/core/patching.js', () => ({
  _pushPatchFrame: vi.fn(),
}));

vi.mock('../main/core/unmounting.js', () => ({
  _remove: vi.fn(),
  _pushUnmountFrame: vi.fn(),
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

const patchedKeys = () => patchSpy.mock.calls.map((c: any) => c[0].node.key);
const mountedKeys = () => mountSpy.mock.calls.map((c: any) => c[0].node.key);
const removedKeys = () => removeSpy.mock.calls.map((c: any) => c[0].key);

describe('patchKeyedChildren', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mountSpy = _pushMountFrame as unknown as MockInstance;
    patchSpy = _pushPatchFrame as unknown as MockInstance;
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
        key: c[0].node.key,
        rightSibling: c[0].meta.rightSibling,
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
      const prevsByKey = Object.fromEntries(calls.map(c => [c[0].node.key, c[0].meta.prevElement]));
      expect(prevsByKey['a']).toBe(prevA);
      expect(prevsByKey['b']).toBe(prevB);
    });

    it('passes PATCH_ENTER as the phase on every patch frame', () => {
      const { frame } = makeFrame([el('a'), el('b')], [el('a'), el('b')]);
      _patchKeyedChildren(frame);

      for (const call of patchSpy.mock.calls as any[]) {
        expect(call[0].phase).toBe(PATCH_ENTER);
      }
    });

    it('passes MOUNT_ENTER as the phase on every mount frame', () => {
      const { frame } = makeFrame([], [el('a'), el('b')]);
      _patchKeyedChildren(frame);

      for (const call of mountSpy.mock.calls as any[]) {
        expect(call[0].phase).toBe(MOUNT_ENTER);
      }
    });

    it('propagates parentReference, context, and hostNamespace unchanged', () => {
      const { frame } = makeFrame([el('a')], [el('a')]);
      _patchKeyedChildren(frame);

      const meta = (patchSpy.mock.calls[0] as any)[0].meta;
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

      const mountCall = (mountSpy.mock.calls as any[]).find((c: any) => c[0].node.key === 'e');
      expect(mountCall).toBeDefined();

      const rightSibling = mountCall[0].meta.rightSibling;
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
            log.push({ phase: String(frame.phase), key: frame.node?.key ?? null });
          },
        } as any,
      };

      // Spy implementations append to the same log
      mountSpy.mockImplementation((frame: any) => {
        log.push({ phase: String(MOUNT_ENTER), key: frame.node?.key ?? null });
      });
      patchSpy.mockImplementation((frame: any) => {
        log.push({ phase: String(PATCH_ENTER), key: frame.node?.key ?? null });
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

    it('step 3: suffix patch is pushed before prefix patch (LIFO → prefix executes first)', () => {
      // prev: [a, b, c, d]   next: [a, d]
      // prefix: a  |  removed: b, c  |  suffix: d
      // Intended execution order: patch(a) then patch(d).
      // Because stack is LIFO, suffix must be pushed before prefix.
      // Push order in log: d (suffix) then a (prefix).
      const log = runAndCollect([el('a'), el('b'), el('c'), el('d')], [el('a'), el('d')]);

      const patchLog = log.filter(f => f.phase === String(PATCH_ENTER)).map(f => f.key);
      // suffix 'd' pushed first, prefix 'a' pushed second
      expect(patchLog).toEqual(['d', 'a']);
    });

    it('step 3: multi-node suffix is pushed in reverse list order, prefix pushed last', () => {
      // prev: [a, b, c, d, e]  next: [a, d, e]
      // prefix: a  |  removed: b, c  |  suffix: d, e
      // Suffix loop runs suffixPairs in reverse (e first, then d).
      // Prefix pushed after. Push order: e, d, a.
      // Execution order (LIFO): a, d, e — correct forward order.
      const log = runAndCollect([el('a'), el('b'), el('c'), el('d'), el('e')], [el('a'), el('d'), el('e')]);

      const patchLog = log.filter(f => f.phase === String(PATCH_ENTER)).map(f => f.key);
      expect(patchLog).toEqual(['e', 'd', 'a']);
    });

    // -- Step 4 (prev exhausted) --------------------------------------------

    it('step 4: mount frames are pushed in reverse list order (LIFO → executes first-to-last)', () => {
      // prev: []   next: [a, b, c]
      // Mount loop: i=2(c), i=1(b), i=0(a) → pushed c, b, a.
      // Execution order (LIFO): a, b, c — correct DOM insertion order.
      const log = runAndCollect([], [el('a'), el('b'), el('c')]);

      const mountLog = log.filter(f => f.phase === String(MOUNT_ENTER)).map(f => f.key);
      expect(mountLog).toEqual(['c', 'b', 'a']);
    });

    it('step 4: suffix pushed before middle mounts, prefix pushed last of all', () => {
      // prev: [a, e]   next: [a, b, c, e]
      // prefix: a  |  new middle: b, c  |  suffix: e
      // Push order: middle reversed (c, b), then suffix (e), then prefix (a).
      // Execution order (LIFO): a, b, c, e.
      const log = runAndCollect([el('a'), el('e')], [el('a'), el('b'), el('c'), el('e')]);

      const pushKeys = log.map(f => f.key);
      const idxA = pushKeys.lastIndexOf('a'); // prefix, must be last
      const idxE = pushKeys.indexOf('e'); // suffix, after middle mounts

      // prefix 'a' is the very last push
      expect(idxA).toBe(pushKeys.length - 1);

      // suffix 'e' comes after all middle mounts in push log
      expect(pushKeys.indexOf('c')).toBeLessThan(idxE);
      expect(pushKeys.indexOf('b')).toBeLessThan(idxE);
    });

    it('step 4: new middle mounts are pushed in reverse list order', () => {
      // prev: [head, tail]   next: [head, x, y, z, tail]
      // prefix: head  |  new middle: x, y, z  |  suffix: tail
      // Mount loop: i=3(z), i=2(y), i=1(x) → pushed z, y, x.
      const log = runAndCollect([el('head'), el('tail')], [el('head'), el('x'), el('y'), el('z'), el('tail')]);

      const mountLog = log.filter(f => f.phase === String(MOUNT_ENTER)).map(f => f.key);
      expect(mountLog).toEqual(['z', 'y', 'x']);
    });

    // -- Step 5 (unknown middle) --------------------------------------------

    it('step 5: middle frames are pushed in reverse next-list order', () => {
      // prev: [b, c, d]   next: [d, b, c]  — pure reorder, no prefix/suffix
      // Loop: i=2(c), i=1(b), i=0(d) → push order: c, b, d.
      // Execution order (LIFO): d, b, c — matches next list order.
      const log = runAndCollect([el('b'), el('c'), el('d')], [el('d'), el('b'), el('c')]);

      const patchLog = log.filter(f => f.phase === String(PATCH_ENTER)).map(f => f.key);
      expect(patchLog).toEqual(['c', 'b', 'd']);
    });

    it('step 5: middle pushed first, then suffix, then prefix — all in reverse within each group', () => {
      // prev: [a, b, c, d, z]   next: [a, d, b, c, z]
      // prefix: a  |  middle: d,b,c (reordered)  |  suffix: z
      // Middle loop reversed (i=3..1): c, b, d.
      // Suffix pushed after middle: z.
      // Prefix pushed last: a.
      // Full push log: c, b, d, z, a.
      // Execution order (LIFO): a, d, b, c, z — correct next-list order.
      const log = runAndCollect(
        [el('a'), el('b'), el('c'), el('d'), el('z')],
        [el('a'), el('d'), el('b'), el('c'), el('z')]
      );

      const pushKeys = log.map(f => f.key);

      // prefix 'a' is the very last push
      expect(pushKeys[pushKeys.length - 1]).toBe('a');

      // suffix 'z' is pushed after all middle keys
      const idxZ = pushKeys.indexOf('z');
      for (const midKey of ['b', 'c', 'd']) {
        expect(pushKeys.indexOf(midKey)).toBeLessThan(idxZ);
      }

      // 'z' comes right before 'a'
      expect(pushKeys[pushKeys.length - 2]).toBe('z');
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
      // prev: [a, b, c]   next: [c, x, a, b]   — no shared prefix/suffix
      //
      // Key→prevIndex map: a=0, b=1, c=2
      // maxPrevIndexSoFar tracks relative order. Loop runs reversed i=3..0:
      //
      //   i=3 (b): prevIdx=1. 1 > -1 → maxPrev=1.  moved still false.
      //            → PLACE(b), PATCH(b)
      //   i=2 (a): prevIdx=0. 0 < 1  → moved=true.
      //            → PLACE(a), PATCH(a)
      //   i=1 (x): new (mapped=0)    → MOUNT(x)
      //   i=0 (c): prevIdx=2. moved=true.
      //            → PLACE(c), PATCH(c)
      //
      // Full push log:
      //   PLACE(b), PATCH(b), PLACE(a), PATCH(a), MOUNT(x), PLACE(c), PATCH(c)
      const log = runAndCollect([el('a'), el('b'), el('c')], [el('c'), el('x'), el('a'), el('b')]);

      const P = String(HOST_OPS_PLACE_ELEMENT_BEFORE_ANCHOR);
      const T = String(PATCH_ENTER);
      const M = String(MOUNT_ENTER);

      expect(log.map(f => `${f.phase}:${f.key}`)).toEqual([
        `${P}:b`,
        `${T}:b`,
        `${P}:a`,
        `${T}:a`,
        `${M}:x`,
        `${P}:c`,
        `${T}:c`,
      ]);
    });

    it('step 5: a,b,c,d → d,b,e,a — exact push sequence with removal, insertion, and moves', () => {
      // prev: [a, b, c, d]   next: [d, b, e, a]
      //
      // Prefix scan: a!==d → stops. Suffix scan: d!==a → stops.
      // Entire list goes through step 5.
      //
      // Key→prevIndex map: a=0, b=1, c=2, d=3
      //
      // Match loop (i=0..3):
      //   i=0 d: prevIdx=3. 3>-1  → maxPrev=3. newIndexToOldIndex[0]=4
      //   i=1 b: prevIdx=1. 1<3   → moved=true. newIndexToOldIndex[1]=2
      //   i=2 e: no match         → newIndexToOldIndex[2]=0  (new node)
      //   i=3 a: prevIdx=0. moved already true. newIndexToOldIndex[3]=1
      //
      // Remove stale: usedPrev[2] (c) never marked → remove(c)
      //
      // Render loop builds a plan (i=3..0), rightSibling starts null:
      //   i=3 a: matched → plan: PLACE(a), PATCH(a). rs=a
      //   i=2 e: new     → deferred with captured rs=a. rs=e
      //   i=1 b: matched → plan: PLACE(b), PATCH(b). rs=b
      //   i=0 d: matched → plan: PLACE(d), PATCH(d). rs=d
      //
      // Plan before reorder:
      //   PLACE(a), PATCH(a), MOUNT(e,rs=a), PLACE(b), PATCH(b), PLACE(d), PATCH(d)
      //
      // Reorder: MOUNT(e,rs=a) must be pushed AFTER PATCH(a) so that LIFO
      // execution runs PATCH(a) before MOUNT(e). PATCH(a) is already immediately
      // before MOUNT(e) in the plan, so no movement needed.
      //
      // Final push log:
      //   PLACE(a), PATCH(a), MOUNT(e,rs=a), PLACE(b), PATCH(b), PLACE(d), PATCH(d)
      //
      // Execution order (LIFO):
      //   PATCH(d) → PLACE(d) → PATCH(b) → PLACE(b) → MOUNT(e,rs=a) → PATCH(a) → PLACE(a)
      //
      // PATCH(a) runs before MOUNT(e), so a.reference is valid when e calls
      // resolveAnchorReference(a). e is inserted before a. ✓

      const log = runAndCollect([el('a'), el('b'), el('c'), el('d')], [el('d'), el('b'), el('e'), el('a')]);

      const P = String(HOST_OPS_PLACE_ELEMENT_BEFORE_ANCHOR);
      const T = String(PATCH_ENTER);
      const M = String(MOUNT_ENTER);

      expect(log.map(f => `${f.phase}:${f.key}`)).toEqual([
        `${P}:a`,
        `${T}:a`,
        `${M}:e`,
        `${P}:b`,
        `${T}:b`,
        `${P}:d`,
        `${T}:d`,
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
        key: c[0].node.key as string,
        rightSibling: c[0].meta.rightSibling as any,
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
        expect(call[0].meta.placeHolderElement).toBeNull();
      }
    });
  });
});
