# Unmounting

Unmounting tears down an element subtree and releases all associated host resources.

**Entry point:** `unmount(element, renderRuntime)`

Asserts render stack is empty, pushes one `UNMOUNT_ENTER` frame, then calls `processStack`.

## Top-level flow

```mermaid
flowchart TD
    CALL["unmount(element, renderRuntime)"] --> GUARD{stack empty?}
    GUARD -->|no| ERR["throw: Cannot unmount\nwhile rendering"]
    GUARD -->|yes| PUSH["push UNMOUNT_ENTER"]
    PUSH --> LOOP["processStack()"]
    LOOP --> DONE(["subtree unmounted"])
```

## Per-type dispatch (UNMOUNT_ENTER)

```mermaid
flowchart TD
    UE["UNMOUNT_ENTER"] --> BSF["bitScanForwardIndex(flag)"]
    BSF -->|0 HOST| HOST["unmountHostEnter"]
    BSF -->|1 FC| FC["unmountFCEnter"]
    BSF -->|2 TEXT| TEXT["noop (no cleanup needed)"]
    BSF -->|3 PORTAL| PORTAL["unmountPortalElement"]
    BSF -->|4 FRAGMENT| FRAG["unmountFragmentElement"]
```

TEXT elements carry no host state that requires cleanup — the text node is removed by the parent HOST element's DOM removal.

## HOST

```mermaid
flowchart TD
    HE["unmountHostEnter"] --> PX["push UNMOUNT_EXIT"]
    PX --> PC["push UNMOUNT_CHILDREN_ENTER"]

    UC["UNMOUNT_CHILDREN_ENTER processed first (LIFO)"] --> CH["children torn down"]
    CH --> MX["UNMOUNT_EXIT processed → unmountHostExit"]

    MX --> UR["unmountRef(element)"]
    UR --> UP["unmountProps(ref, element, runtime)\n(removes event listeners, etc.)"]
    UP --> DE["detachElementFromReference(ref, runtime)\n(removes from dom module's elementToHostMap)"]
```

Note: `unmountHostExit` does **not** remove the DOM node from the document. The caller is responsible for DOM removal (typically via `hostAdapter.removeChild` triggered by the parent's reconciliation). Unmounting only releases resource ownership (event listeners, element maps, refs).

## FC

```mermaid
flowchart TD
    FE["unmountFCEnter"] --> CHECK{already unmounted?}
    CHECK -->|yes — already torn down| BAIL["return (skip double-unmount)"]
    CHECK -->|no| PX["push UNMOUNT_EXIT"]
    PX --> PC["push UNMOUNT_CHILDREN_ENTER"]

    UC["UNMOUNT_CHILDREN_ENTER processed first (LIFO)"] --> CH["children torn down"]
    CH --> FX["UNMOUNT_EXIT → unmountFCExit"]

    FX --> FLAG["element.unmounted = true"]
    FLAG --> PUB["publish 'unmounted' lifecycle event"]
    PUB --> HOOKS["hooks plugin:\nrun effect cleanups\nremove context subscriptions"]
```

The `unmounted = true` flag on the element object guards against stale `rerender()` calls (e.g. from a `useEffect` cleanup that fires after unmount).

## PORTAL

```mermaid
flowchart TD
    PE["unmountPortalElement"] --> CLR["clearElementHostReference(\n  portal.children, portal.ref (container), runtime\n)\n→ removes children from container's DOM"]
    CLR --> PC["push UNMOUNT_CHILDREN_ENTER\n(recursively unmount child subtree)"]
```

Portals remove their children from the remote container before recursing, so the subtree is visually gone before the FC `unmounted` events fire.

## FRAGMENT

```mermaid
flowchart TD
    FG["unmountFragmentElement"] --> PC["push UNMOUNT_CHILDREN_ENTER\n(unmount all children)"]
```

Fragments have no host reference of their own; they only propagate the unmount to their children.

## Children teardown order

`unmountChildren` pushes child `UNMOUNT_ENTER` frames in **reverse order**, so `processStack` processes them front-to-back. This is the natural teardown order (first child unmounted first), matching mounting order.

```mermaid
flowchart TD
    UC["UNMOUNT_CHILDREN_ENTER"] --> CF{childFlag}
    CF -->|ELEMENT| SE["push UNMOUNT_ENTER(child)"]
    CF -->|LIST| RL["for i = len-1 downto 0:\n push UNMOUNT_ENTER(children[i])"]
    CF -->|EMPTY or TEXT| NOP["noop"]
```

## Full sequence for a single FC with a HOST child

```mermaid
sequenceDiagram
    participant S as renderStack
    participant P as processStack

    Note over S: initial
    S->>S: push UNMOUNT_ENTER(FC)
    P->>S: pop → UNMOUNT_ENTER(FC)
    S->>S: push UNMOUNT_EXIT(FC)
    S->>S: push UNMOUNT_CHILDREN_ENTER(FC)
    P->>S: pop → UNMOUNT_CHILDREN_ENTER(FC)
    S->>S: push UNMOUNT_ENTER(HOST)
    P->>S: pop → UNMOUNT_ENTER(HOST)
    S->>S: push UNMOUNT_EXIT(HOST)
    S->>S: push UNMOUNT_CHILDREN_ENTER(HOST)
    P->>S: pop → UNMOUNT_CHILDREN_ENTER(HOST)
    Note over P: HOST has no children → noop
    P->>S: pop → UNMOUNT_EXIT(HOST)
    Note over P: unmountRef, unmountProps, detach
    P->>S: pop → UNMOUNT_EXIT(FC)
    Note over P: unmounted=true, publish 'unmounted'
```
