# Patching

Patching reconciles an existing element subtree against a new description, updating the host environment with the minimum set of changes.

**Entry point:** `patch(prevElement, nextElement, parentReference, subtreeRightBoundary, context, hostNamespace, renderRuntime)`

Asserts render stack is empty, pushes one `PATCH_ENTER` frame, then calls `processStack`.

## Top-level type/key check

The first thing `patchEnter` does is compare `prevElement.type` and `prevElement.key` against `nextElement`. A mismatch means the two elements represent entirely different trees — the old subtree is torn down and a new one is mounted.

```mermaid
flowchart TD
    PE["PATCH_ENTER"] --> CK{same type and key?}
    CK -->|no — different type or key| REP["replaceWithNewElement:\n push UNMOUNT_ENTER(prev)\n  push MOUNT_ENTER(next)"]
    CK -->|yes — same element| DISP["dispatch per flag"]

    DISP -->|HOST| HOST
    DISP -->|FC| FC
    DISP -->|TEXT| TEXT
    DISP -->|PORTAL| PORTAL
    DISP -->|FRAGMENT| FRAG
```

For HOST-to-HOST replacement, a `HOST_OPS_REPLACE_CHILD` frame is pushed to atomically swap the DOM node before unmounting the old subtree.

## HOST (`patchHostEnter / patchHostExit`)

```mermaid
flowchart TD
    PH["patchHostEnter"] --> TR["transfer ref and reference\nfrom prevElement to nextElement"]
    TR --> ATR["attachElementToReference\n(nextElement, ref, runtime)"]
    ATR --> PX["push PATCH_EXIT"]
    PX --> PC["patchChildren(nextElement, ...)"]

    MX["PATCH_EXIT → patchHostExit"] --> PP["patchProps(ref, prev, next, ...)"]
    PP --> CN{className changed?}
    CN -->|yes| SC["setClassname(ref, className, ...)"]
    CN -->|no| RF["applyRef(nextElement)"]
    SC --> RF
```

`patchChildren` is called synchronously inside `patchHostEnter` (not via the stack) because it needs to inspect `prevElement.children` before the frame is recycled. It pushes `PATCH_ENTER` / `MOUNT_ENTER` / `UNMOUNT_ENTER` frames for each child.

## FC (`patchFCEnter / patchFCExit`)

```mermaid
flowchart TD
    PF["patchFCEnter"] --> UM{prevElement unmounted?}
    UM -->|yes| RMT["push MOUNT_ENTER(jsxElement)\n(re-mount after error recovery)"]
    UM -->|no| SWAP{jsxElement !== prevElement?}

    SWAP -->|yes| SWP["swapChildInParent\n(replace jsx shortlived with prevElement\nin parent's children array)"]
    SWP --> MEMO
    SWAP -->|no| MEMO{memo and same props?}
    MEMO -->|yes — skip render| BAIL["return (no update)"]
    MEMO -->|no| UPD["prevElement.props = jsxElement.props"]

    UPD --> LOOP["do...while(triedToRerender)"]
    LOOP --> BR["publish beforeRender"]
    BR --> REN["renderer(FC, prevElement, runtime)"]
    REN --> AR["publish afterRender"]
    AR --> TRR{triedToRerender?}
    TRR -->|yes| LOOP
    TRR -->|no| NR["normalizeRoot(prevElement, nextChildren)"]
    NR --> PX["push PATCH_EXIT"]
    PX --> PCH["patchChildren(prevElement, ...)"]

    ERR["exception"] --> CLR["detachElementFromParent(prev)\nclearElementHostReference(prev, ...)\npush UNMOUNT_ENTER(prev)"]
    CLR --> EPUB["publish errored"]
    EPUB --> HND{handled?}
    HND -->|no| THROW["throw"]
    HND -->|yes| RET["return"]

    EX["PATCH_EXIT → patchFCExit"] --> PUB["publish 'updated' event"]
```

`jsxElement` is the short-lived element produced by the parent's render. After `swapChildInParent`, `prevElement` (the long-lived object) is used for all further work.

## TEXT (`patchTextElement`)

```mermaid
flowchart TD
    PT["patchTextElement"] --> TR["nextElement.reference = prevElement.reference"]
    TR --> CMP{children changed?}
    CMP -->|yes| STC["setTextContent(ref, nextChildren)"]
    CMP -->|no| DONE(["done"])
    STC --> DONE
```

## PORTAL (`patchPortalEnter / patchPortalExit`)

```mermaid
flowchart TD
    PP["patchPortalEnter"] --> TR["nextElement.reference = prevElement.reference"]
    TR --> CC{container changed?}
    CC -->|yes + has children| PX["push PATCH_EXIT"]
    CC -->|no| PCH
    PX --> PCH["patchChildren into nextContainer"]

    EX["PATCH_EXIT → patchPortalExit"] --> RM["removeChild(prevContainer, children.reference)"]
    RM --> INS["insertOrAppend(nextContainer, children.reference, null)"]
```

## Children reconciliation

`patchChildren` handles all transitions between childFlag shapes (EMPTY ↔ ELEMENT ↔ LIST ↔ TEXT). Single-element and text transitions patch or mount/unmount straightforwardly. The interesting case is LIST ↔ LIST, which goes through the keyed reconciliation algorithm.

### Keyed children (LIST → LIST)

The algorithm minimises DOM moves while correctly handling arbitrary reorderings.

```mermaid
flowchart TD
    KR["patchKeyedChildren(prev[], next[])"] --> PRE["Prefix sync:\nadvance prevStart/nextStart\nwhile keys match at front"]
    PRE --> SUF["Suffix sync:\nretract prevEnd/nextEnd\nwhile keys match at back"]
    SUF --> NE{next middle exhausted?}
    NE -->|yes| RMV["unmount remaining prev middle"]
    NE -->|no| PE2{prev middle exhausted?}
    PE2 -->|yes| ADD["mount all next middle children"]
    PE2 -->|no| GEN["General case"]

    GEN --> MAP["build keyToPrevChild map"]
    MAP --> IDX["build newIndexToOldIndex array\ndetect if any prev index went backwards\n(moved = true)"]
    IDX --> LIS{moved?}
    LIS -->|yes| LISF["getLongestIncreasingSubsequence(newIndexToOldIndex)\n= stable set that needs no DOM move"]
    LIS -->|no| LISNOOP["stable = empty (all in place)"]
    LISF --> PROC
    LISNOOP --> PROC

    PROC["process next middle (left to right):"] --> EACH{for each next child}
    EACH -->|oldIndex === 0| MNT["push MOUNT_ENTER (new element)"]
    EACH -->|in LIS stable set| PTCH["push PATCH_ENTER\n(no DOM move needed)"]
    EACH -->|not in LIS, moved| PLMV["push HOST_OPS_PLACE_ELEMENT\npush PATCH_ENTER"]

    MNT --> SUFFIX
    PTCH --> SUFFIX
    PLMV --> SUFFIX
    SUFFIX["push prefix patches\npush suffix patches"]
```

The LIS (Longest Increasing Subsequence) of the `newIndexToOldIndex` array identifies which children are already in the correct relative order and need no DOM move. Only the remaining children are repositioned.

## Patching from the middle of the tree

`rerender()` triggers a patch from an arbitrary FC element rather than from the root. It calls:

```ts
patch(element, element, findParentReferenceFromElement(element), null, element.context, element.hostNamespace, renderRuntime)
```

`prevElement === nextElement` — the element patches against itself. `patchFCEnter` detects this case (`jsxElement === prevElement`, so `swapChildInParent` is skipped and the memo check is bypassed since self-rerenders always proceed). The rest of the flow is identical to a root patch.
