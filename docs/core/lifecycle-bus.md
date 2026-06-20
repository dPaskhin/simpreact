# Lifecycle Event Bus

The lifecycle bus is the integration layer between the core rendering engine and the feature modules (hooks, context, rerender scheduling). Core publishes events at well-defined points; feature modules subscribe to implement their behavior without touching the core rendering code.

## Architecture

```mermaid
flowchart TD
    subgraph Core
        MOUNT["mounting.ts\nmountFCEnter / mountFCExit"]
        PATCH["patching.ts\npatchFCEnter / patchFCExit"]
        UNMOUNT["unmounting.ts\nunmountFCExit"]
    end

    subgraph Bus["lifecycle bus (per runtime)"]
        PUB["publish(event)"]
        SUB["subscribe(fn) → unsubscribe()"]
    end

    subgraph Subscribers
        HOOKS["hooks/index.ts"]
        CTX["context/index.ts"]
        RR["rerender.ts"]
    end

    MOUNT -->|publishes| PUB
    PATCH -->|publishes| PUB
    UNMOUNT -->|publishes| PUB
    PUB -->|notifies| HOOKS
    PUB -->|notifies| CTX
    PUB -->|notifies| RR
```

## Bus per runtime

Each `SimpRenderRuntime` gets its own bus instance, created lazily on first access:

```mermaid
flowchart TD
    CALL["getLifecycleEventBus(runtime)"] --> CHK{runtime bus cached?}
    CHK -->|yes| GET["return existing bus"]
    CHK -->|no| CREATE["createBus()"]
    CREATE --> PLUG["for each plugin in plugins[]: plugin(bus)"]
    PLUG --> STORE["busByRuntime.set(runtime, bus)"]
    STORE --> GET
```

`plugins[]` is a module-level array populated by `registerLifecyclePlugin`. Any plugin registered before the first `getLifecycleEventBus` call for a given runtime is automatically applied when the bus is created.

## Plugin registration

```mermaid
flowchart TD
    REG["registerLifecyclePlugin(plugin)"] --> PUSH["plugins.push(plugin)"]
    PUSH --> NOTE["Applied to all future bus instances\nand to existing buses that haven't\nbeen created yet"]
```

Feature modules call `registerLifecyclePlugin` at module import time (top-level), so plugins are registered once when the module is first loaded. This is why importing `@simpreact/hooks` is sufficient to activate all hook lifecycle management — no explicit wiring is needed.

## Event types

| Event type | Publisher | Payload extras |
|---|---|---|
| `beforeRender` | `mountFCEnter`, `patchFCEnter` | — |
| `afterRender` | `mountFCEnter`, `patchFCEnter` | — |
| `triedToRerender` | `rerender()` | — |
| `mounted` | `mountFCExit` | — |
| `updated` | `patchFCExit` | — |
| `unmounted` | `unmountFCExit` | — |
| `errored` | `mountFCEnter` catch, `patchFCEnter` catch | `error: any`, `handled: boolean` |

All events carry `element: SimpElement` and `renderRuntime: SimpRenderRuntime`.

`errored.handled` is a mutable flag on the event object. A subscriber sets it to `true` to signal that the error was caught and the component should not crash. The first subscriber to claim it wins; core checks `event.handled` after publishing.

## Event timeline for an FC render

```mermaid
sequenceDiagram
    participant Core as mounting/patching
    participant Bus as lifecycle bus
    participant Hooks as hooks plugin
    participant Ctx as context plugin
    participant RR as rerender plugin

    Core->>Bus: publish beforeRender
    Bus->>Hooks: set currentFC, reset hooksIndex
    Bus->>Ctx: set currentFC

    Note over Core: call renderer(FC, element, runtime)
    Note over Core: hooks run (useState, useEffect, ...)

    Core->>Bus: publish afterRender
    Bus->>Hooks: check hook count, clear currentFC
    Bus->>Ctx: clear currentFC
    Bus->>RR: remove element from queues

    Note over Core: (on mount path)
    Core->>Bus: publish mounted
    Bus->>Hooks: run useEffect callbacks

    Note over Core: (on patch path)
    Core->>Bus: publish updated
    Bus->>Hooks: run useEffect cleanups + callbacks
```

## Error handling flow

```mermaid
sequenceDiagram
    participant Core
    participant Bus
    participant Hooks

    Core->>Core: renderer() throws
    Core->>Bus: publish errored (handled=false)
    Bus->>Hooks: walk parent chain for useCatch handlers
    Hooks->>Hooks: call handler(error)
    Hooks->>Bus: event.handled = true
    Bus-->>Core: (event.handled is now true)
    Core->>Core: check event.handled
    Core->>Bus: publish afterRender (errored path)
    Bus->>Hooks: clear currentFC
    Bus->>Ctx: clear currentFC
    Bus->>RR: remove element from queues
    Note over Core: return without re-throwing
```

If no subscriber sets `event.handled = true`, core wraps the original error in a new `Error` with `{ cause }` and re-throws it, crashing the render.

## `triedToRerender` — in-render state update

This event is special: it is published by `rerender()` and consumed by the active render loop itself. `mountFCEnter` and `patchFCEnter` subscribe temporarily (for the duration of one FC's render) to detect whether `rerender` was called for the current element during its own render function. If so, the `do...while` loop re-runs.

```mermaid
sequenceDiagram
    participant FC as render loop
    participant Bus
    participant State as useState setter

    FC->>Bus: temporary subscribe (triedToRerender)
    FC->>FC: call renderer()
    FC->>State: useState setter called inside render
    State->>rerender: rerender(element, runtime)
    rerender->>Bus: publish triedToRerender
    Bus->>FC: triedToRerender subscriber fires → flag = true
    FC->>FC: afterRender published
    FC->>FC: triedToRerender === true → loop again
    FC->>Bus: unsubscribe (in finally)
```

The temporary subscription is unsubscribed in the `finally` block regardless of whether the render succeeded or threw.
