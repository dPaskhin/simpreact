# Rerender

A rerender is a self-triggered patch: a mounted FC element signals that its internal state changed and it should re-run its render function. The core mechanism is `rerender(element, renderRuntime)`, which schedules (or immediately flushes) a call to `patch(element, element, ...)`.

All rerender state is stored in a per-runtime `WeakMap<SimpRenderRuntime, RerenderSpecificData>`:

```ts
interface RerenderSpecificData {
  syncQueue:            Set<SimpElement>;  // flush synchronously when sync lock drops to 0
  asyncQueue:           Set<SimpElement>;  // flush via queueMicrotask
  syncLockDepth:        number;            // nesting depth of withSyncRerender calls
  isAsyncFlushScheduled: boolean;          // dedup microtask scheduling
}
```

## `rerender(element, renderRuntime)`

```mermaid
flowchart TD
    R["rerender(element, runtime)"] --> UM{unmounted?}
    UM -->|yes| WARN["console.warn\nreturn"]
    UM -->|no| TRR["publish 'triedToRerender'\n(signals active render loop\nto re-run if this element is\ncurrently rendering)"]
    TRR --> SL{syncLockDepth > 0?}
    SL -->|yes — inside withSyncRerender| SQ["syncQueue.add(element)\nreturn"]
    SL -->|no| AQ["asyncQueue.add(element)"]
    AQ --> SCH["scheduleAsyncFlush()"]
```

### triedToRerender and render-time state updates

When `rerender` is called during the render of the same element (e.g. a state setter called from inside a render function), the `triedToRerender` event fires. The active `do...while` loop in `mountFCEnter` / `patchFCEnter` is subscribed to this event and sets a flag that causes the loop to re-run immediately after `afterRender`. This handles the case without queuing.

## Async flush

```mermaid
flowchart TD
    SCH["scheduleAsyncFlush()"] --> CHK{already scheduled?}
    CHK -->|yes| BAIL["return (already pending)"]
    CHK -->|no| SET["isAsyncFlushScheduled = true"]
    SET --> QMT["queueMicrotask(process)"]

    PROC["process()"] --> SZ{asyncQueue empty?}
    SZ -->|yes| CLR["isAsyncFlushScheduled = false\nreturn"]
    SZ -->|no| FLUSH["flushQueue(asyncQueue, runtime)"]
    FLUSH --> REQMT["queueMicrotask(process)\n(loop until drained)"]
```

Multiple `rerender` calls for different elements that arrive in the same synchronous turn are all added to `asyncQueue` before any microtask runs. `flushQueue` processes the entire set in one pass, then re-schedules itself in case the flush produced further rerenders.

## `withSyncRerender(renderRuntime, callback)`

`withSyncRerender` is used to batch state updates that must be applied synchronously — typically event handlers where you want all downstream patches to complete before returning to the caller.

```mermaid
flowchart TD
    WSR["withSyncRerender(runtime, callback)"] --> INC["syncLockDepth++"]
    INC --> CB["callback()\n(may call rerender → syncQueue)"]
    CB --> DEC["syncLockDepth--"]
    DEC --> ZERO{depth === 0?}
    ZERO -->|yes| FLUSH["flushQueue(syncQueue, runtime)"]
    ZERO -->|no| DONE(["return\n(outer withSyncRerender\nwill flush)"])
    FLUSH --> DONE
```

`withSyncRerender` calls can nest. Each level increments the lock depth. Only the outermost exit (depth goes 1→0) flushes the sync queue.

### Interaction between sync and async queues

```mermaid
sequenceDiagram
    participant App
    participant RR as rerender()
    participant SQ as syncQueue
    participant AQ as asyncQueue
    participant MT as microtask

    App->>+withSyncRerender: withSyncRerender(runtime, cb)
    Note over withSyncRerender: syncLockDepth = 1
    withSyncRerender->>App: cb()
    App->>RR: rerender(A)
    RR->>SQ: syncQueue.add(A)
    App->>RR: rerender(B)
    RR->>SQ: syncQueue.add(B)
    App-->>withSyncRerender: cb returns
    Note over withSyncRerender: syncLockDepth = 0 → flush syncQueue
    withSyncRerender->>+flushQueue: flushQueue(syncQueue)
    flushQueue->>patch: patch(A, A, ...)
    flushQueue->>patch: patch(B, B, ...)
    flushQueue-->>-withSyncRerender: done
    deactivate withSyncRerender

    Note over App: later, in a normal event handler:
    App->>RR: rerender(C)
    RR->>AQ: asyncQueue.add(C)
    RR->>MT: queueMicrotask(process)
    MT->>+flushQueue: flushQueue(asyncQueue)
    flushQueue->>patch: patch(C, C, ...)
    flushQueue-->>-MT: done
```

## `performRerender(element, renderRuntime)`

The actual work is a self-patch:

```ts
patch(
  element,                                   // prevElement = element itself
  element,                                   // nextElement = element itself
  findParentReferenceFromElement(element),   // walk parent chain to find host ref
  null,                                      // no subtree right boundary
  element.context || null,
  element.hostNamespace,
  renderRuntime
)
```

`patchFCEnter` sees `jsxElement === prevElement` and skips `swapChildInParent` and the memo check, proceeding directly to re-rendering.

## Queue cleanup

When an element finishes rendering or is unmounted, it is removed from both queues so stale entries never reach `performRerender`:

```mermaid
flowchart TD
    EV["lifecycle event"] --> T{type}
    T -->|afterRender| DEL["asyncQueue.delete(element)\nsyncQueue.delete(element)"]
    T -->|errored| DEL
    T -->|unmounted| DEL
```
