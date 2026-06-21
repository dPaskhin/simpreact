# Process Stack

The rendering engine is **iterative, not recursive**. Work is described as typed frames pushed onto `renderRuntime.renderStack` (a plain `SimpRenderFrame[]`). A single `processStack` loop pops and dispatches them until the stack is empty.

This avoids JavaScript call-stack overflows for deep trees and makes it straightforward to interleave mount, patch, unmount, and DOM placement operations on the same pass.

## Frame types

| Kind constant | Value | Handler |
|---|---|---|
| `MOUNT_ENTER` | 10 | `mountEnter(frame)` |
| `MOUNT_EXIT` | 11 | `mountExit(frame)` |
| `MOUNT_CHILDREN_ENTER` | 12 | `mountChildren(frame)` |
| `PATCH_ENTER` | 20 | `patchEnter(frame)` |
| `PATCH_EXIT` | 21 | `patchExit(frame)` |
| `UNMOUNT_ENTER` | 30 | `unmountEnter(frame)` |
| `UNMOUNT_EXIT` | 31 | `unmountExit(frame)` |
| `UNMOUNT_CHILDREN_ENTER` | 32 | `unmountChildren(frame)` |
| `HOST_OPS_PLACE_ELEMENT_BEFORE_ANCHOR` | 40 | `placeElementBeforeAnchor` |
| `HOST_OPS_REPLACE_CHILD` | 42 | `hostAdapter.replaceChild` |

## The main loop

```mermaid
flowchart TD
    START(["processStack(renderRuntime)"]) --> CHECK{stack.length > 0?}
    CHECK -->|no| END(["return"])
    CHECK -->|yes| POP["frame = stack.pop()"]
    POP --> DISPATCH{frame.kind}

    DISPATCH -->|MOUNT_ENTER 10| ME["mountEnter(frame)"]
    DISPATCH -->|MOUNT_EXIT 11| MX["mountExit(frame)"]
    DISPATCH -->|MOUNT_CHILDREN_ENTER 12| MC["mountChildren(frame)"]
    DISPATCH -->|PATCH_ENTER 20| PE["patchEnter(frame)"]
    DISPATCH -->|PATCH_EXIT 21| PX["patchExit(frame)"]
    DISPATCH -->|UNMOUNT_ENTER 30| UE["unmountEnter(frame)"]
    DISPATCH -->|UNMOUNT_EXIT 31| UX["unmountExit(frame)"]
    DISPATCH -->|UNMOUNT_CHILDREN_ENTER 32| UC["unmountChildren(frame)"]
    DISPATCH -->|PLACE 40| PL["placeElementBeforeAnchor"]
    DISPATCH -->|REPLACE 42| RP["hostAdapter.replaceChild"]

    ME --> RECYCLE["frame.node = null\npool.mount.push(frame)"]
    MX --> RECYCLE
    MC --> RECYCLE2["pool.mountChildren.push(frame)"]
    PE --> RECYCLE3["pool.patch.push(frame)"]
    PX --> RECYCLE3
    UE --> RECYCLE4["pool.unmount.push(frame)"]
    UX --> RECYCLE4
    UC --> RECYCLE5["pool.unmountChildren.push(frame)"]
    PL --> RECYCLE6["pool.place.push(frame)"]
    RP --> RECYCLE7["pool.replace.push(frame)"]

    RECYCLE --> CHECK
    RECYCLE2 --> CHECK
    RECYCLE3 --> CHECK
    RECYCLE4 --> CHECK
    RECYCLE5 --> CHECK
    RECYCLE6 --> CHECK
    RECYCLE7 --> CHECK
```

## ENTER / EXIT pairs

Most element types use an enter/exit pair to bracket work that must happen before and after children are processed. The stack is LIFO, so pushing EXIT before CHILDREN means CHILDREN is processed first:

```mermaid
sequenceDiagram
    participant S as renderStack
    participant P as processStack loop

    Note over S: initial state (empty)
    S->>S: push MOUNT_EXIT
    S->>S: push MOUNT_CHILDREN_ENTER
    P->>S: pop → MOUNT_CHILDREN_ENTER
    Note over P: mounts children (may push more frames)
    P->>S: pop → MOUNT_EXIT
    Note over P: mounts props, places element in DOM
```

This pattern is used identically by HOST, FC, PORTAL, and FRAGMENT elements for mount and unmount. Patch uses PATCH_ENTER / PATCH_EXIT the same way.

## Frame pool

Frame objects are expensive to GC at high frequency. `processStack` recycles every frame after use: it nulls `frame.node` (to release the element reference) and returns the frame to a per-runtime pool keyed by `WeakMap<SimpRenderRuntime, FramePool>`.

```mermaid
flowchart LR
    ACQUIRE["acquireMountFrame(...)"] -->|pool not empty| REUSE["pop from pool\noverwrite fields"]
    ACQUIRE -->|pool empty| ALLOC["new MountFrame object"]
    REUSE --> FRAME["frame"]
    ALLOC --> FRAME
    FRAME -->|after processStack dispatch| RETURN["frame.node = null\npool.push(frame)"]
    RETURN --> ACQUIRE
```

`acquire*Frame` functions are the only constructors for frames. Handlers never create frame objects directly.

## Reentrancy guard

`mount()`, `patch()`, and `unmount()` all assert `renderStack.length === 0` before pushing their initial frame. This prevents concurrent entry into `processStack` from the same runtime, which would produce undefined behavior (two interleaved stack walks over the same array).
