# Mounting

Mounting attaches a new element subtree to the host environment for the first time.

**Entry point:** `mount(element, parentReference, subtreeRightBoundary, context, hostNamespace, renderRuntime)`

The function asserts the render stack is empty, pushes one `MOUNT_ENTER` frame, then calls `processStack`. Every subsequent frame is pushed by the handlers themselves — mount is fully iterative.

## Top-level flow

```mermaid
flowchart TD
    CALL["mount(element, parentRef, ...)"] --> GUARD{stack empty?}
    GUARD -->|no| ERR["throw: Cannot mount\nwhile rendering"]
    GUARD -->|yes| PUSH["push MOUNT_ENTER frame"]
    PUSH --> LOOP["processStack()"]
    LOOP --> DONE(["subtree mounted"])
```

## Per-type handlers (MOUNT_ENTER dispatch)

The `flag` field determines which handler runs. `bitScanForwardIndex(flag)` converts the single set bit into an array index `[HOST=0, FC=1, TEXT=2, PORTAL=3, FRAGMENT=4]`.

```mermaid
flowchart TD
    ME["MOUNT_ENTER"] --> BSF["bitScanForwardIndex(flag)"]
    BSF -->|0| HOST["mountHostEnter"]
    BSF -->|1| FC["mountFCEnter"]
    BSF -->|2| TEXT["mountTextElement"]
    BSF -->|3| PORTAL["mountPortalEnter"]
    BSF -->|4| FRAG["mountFragment"]
```

### HOST (`mountHostEnter`)

```mermaid
flowchart TD
    A["mountHostEnter"] --> NS["getHostNamespaces(element, namespace)"]
    NS --> CR["createReference(type, runtime, parentRef, ns.self)\nset element.reference"]
    CR --> ATR["attachElementToReference(element, ref, runtime)"]
    ATR --> PX["push MOUNT_EXIT"]
    PX --> PC["push MOUNT_CHILDREN_ENTER\n(parentRef = element.reference)"]

    MC["MOUNT_CHILDREN_ENTER processed first (LIFO)"] --> CH["children mounted\ninto element.reference"]
    CH --> MX["MOUNT_EXIT processed"]

    MX --> T{childFlag == TEXT?}
    T -->|yes| STC["setTextContent(ref, props.children)"]
    T -->|no| MP
    STC --> MP{props?}
    MP -->|yes| MPR["mountProps(ref, element, ...)"]
    MPR --> CN{className?}
    MP -->|no| CN
    CN -->|yes| SC["setClassname(ref, className, ...)"]
    CN -->|no| PR{parentRef exists?}
    SC --> PR
    PR -->|yes| PL["push HOST_OPS_PLACE_ELEMENT\n(insert into DOM)"]
    PR -->|no| REF["applyRef(element)"]
    PL --> REF
```

**Hydration.** `createReference`/`createTextReference` take `renderRuntime` and `parentReference` so the host adapter can adopt an existing DOM node instead of always creating one. `domAdapter`'s implementation (`src/main/dom/domAdapter.ts`) checks `isHydrating(renderRuntime)`: while hydrating, it walks a per-parent cursor over the real DOM's existing children (seeded from `parentReference.firstChild`), matching each element by tag name / each text node by node type. On a match, the cursor advances and the existing node is reused. On a mismatch, it warns once per parent and falls back to creating a fresh node, leaving the mismatched candidate available for a later sibling to still match against.

### FC (`mountFCEnter`)

```mermaid
flowchart TD
    A["mountFCEnter"] --> CTX{context provided?}
    CTX -->|yes| SC["element.context = context"]
    CTX -->|no| UM
    SC --> UM{already unmounted?}
    UM -->|yes| CLR["element.unmounted = false"]
    UM -->|no| SET
    CLR --> SET["renderRuntime.activeRenderElement = element\nrenderRuntime.pendingRerenderFlag = false"]

    SET --> LOOP["do...while(pendingRerenderFlag)"]
    LOOP --> RST["pendingRerenderFlag = false"]
    RST --> BR["publish beforeRender"]
    BR --> REN["renderer(FC, element, runtime)\n→ children"]
    REN --> AR["publish afterRender"]
    AR --> TRR{pendingRerenderFlag?}
    TRR -->|yes, rerenders ≤ 25| LOOP
    TRR -->|no| NR["normalizeRoot(element, children)"]
    NR --> CLRACT["activeRenderElement = null (finally)"]
    CLRACT --> PX["push MOUNT_EXIT"]
    PX --> PC["push MOUNT_CHILDREN_ENTER"]

    ERR["exception during render"] --> CATCH["publish errored\nevent"]
    CATCH --> HND{handled?}
    HND -->|no| THROW["throw wrapped error"]
    HND -->|yes| RET["return (subtree\nnot mounted)"]

    MX["MOUNT_EXIT → mountFCExit"] --> PUB["publish 'mounted' event"]
```

State updates triggered during the render itself (e.g. a `useState` setter called from a derived value) call `rerender(element, runtime)`, which sees `renderRuntime.activeRenderElement === element` and just sets `pendingRerenderFlag = true` instead of queuing — no event is published for this case. The `do...while` loop checks the flag after `afterRender` and re-runs immediately if set. Up to 25 re-render loops are allowed before throwing. See [rerender.md](./rerender.md).

### TEXT (`mountTextElement`)

```mermaid
flowchart TD
    A["mountTextElement"] --> CTR["createTextReference(children)\nset element.reference"]
    CTR --> PL["push HOST_OPS_PLACE_ELEMENT"]
```

TEXT elements have no EXIT frame — placement is the only post-creation operation.

### PORTAL (`mountPortalEnter`)

A portal renders its children into an external container while inserting an empty text placeholder node at the portal's logical position in the tree.

```mermaid
flowchart TD
    A["mountPortalEnter"] --> PH["createTextElement('')\n= placeholder"]
    PH --> PUB["publish 'portalMounted'\n(element, container = element.ref)"]
    PUB --> PX["push MOUNT_EXIT\n(attach placeholder.ref → portal.ref)"]
    PX --> PC["push MOUNT_CHILDREN_ENTER\n(parentRef = portal.ref ← container)"]
    PC --> PP["push MOUNT_ENTER for placeholder\n(parentRef = original parentRef)"]
    PP --> NOTE["Stack order (LIFO):\n1. mount placeholder at parent\n2. mount children into container\n3. MOUNT_EXIT sets portal.reference\n   = placeholder.reference"]
```

The `portalMounted` event is consumed by the DOM layer's hydration bookkeeping (`hydrationState.ts`) to exclude the portal's container from the parent's hydration-cursor matching, since the container is external to the document position where the portal element itself sits.

### FRAGMENT (`mountFragment`)

```mermaid
flowchart TD
    A["mountFragment"] --> PC["push MOUNT_CHILDREN_ENTER\n(parentRef = fragment's parentRef)"]
```

Fragments have no host reference. Children are mounted directly at the parent's position.

## Child ordering

`mountChildren` pushes child `MOUNT_ENTER` frames in **reverse order** so that when `processStack` pops them it processes them in forward (left-to-right) order. Each child also receives a `subtreeRightBoundary` pointing to its right sibling, which the eventual `HOST_OPS_PLACE_ELEMENT` uses to `insertBefore` the correct anchor.

```mermaid
flowchart LR
    subgraph "push order (reverse)"
        C["push C"] --> B["push B"] --> A["push A"]
    end
    subgraph "pop / process order (forward)"
        PA["pop A"] --> PB["pop B"] --> PC["pop C"]
    end
```
