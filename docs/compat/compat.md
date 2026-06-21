# Compat Layer

`@simpreact/compat` is a thin compatibility shim that makes simpreact usable as a drop-in for React 18. It re-exports or wraps every symbol that a standard React application expects — `createElement`, `useState`, `useEffect`, `createContext`, `render`, `createRoot`, and so on — all backed by the simpreact virtual DOM engine.

## Module map

```
src/main/compat/
├── renderRuntime.js   singleton runtime; all hooks and context bind to it
├── core.js            createElement wrapper, forwardRef, Suspense, Component, …
├── hooks.js           hook implementations (useReducer, useMemo, useId, …)
├── context.js         createContext, useContext — thin wrappers
├── dom.js             render, createRoot, hydrate
├── jsx-runtime.js     jsx, jsxs, jsxDEV — forwarded from @simpreact/jsx-runtime
└── index.js           re-exports everything from the files above
```

---

## Shared renderRuntime

Every compat hook, context call, and render function operates on a single `SimpRenderRuntime` instance defined in `renderRuntime.js`. It holds the lifecycle event bus, the rerender queue, and the host adapter (`domAdapter` from `@simpreact/dom`).

`useRef` and `useRerender` instances used internally by the renderer are lazily assigned after `renderRuntime` is created to avoid a circular module evaluation at import time.

---

## `createElement` wrapper and `REF_SYMBOL`

React strips `ref` from props before the component receives them; simpreact's core does not. The compat `createElement` wrapper enforces this: when the type is a function and props contain `ref`, the ref is removed from the props object and stored under `REF_SYMBOL` — a module-scoped `Symbol('simpreact.compat.ref')`.

Symbol keys are invisible to `for…in`, `Object.keys`, and `JSON.stringify`, so the ref never leaks into HOST element prop application. HOST elements (`typeof type === 'string'`) are passed through unchanged.

---

## `forwardRef`

Returns a `Forwarded` wrapper that reads the ref from `props[REF_SYMBOL]` (defaulting to `null`), strips the Symbol key from props, then calls `Component(cleanProps, ref)`. The inner component is called directly — not via `createElement` — so it shares the hooks context of the `Forwarded` element.

---

## Class components

The renderer duck-types the component: if `prototype.isReactComponent` or `prototype.render` is set, it takes the class path; otherwise it calls the function directly.

**Instance persistence.** `useRef(null)` stores the class instance across render calls. On the first render `instRef.current === null`, so a new instance is created; subsequent renders reuse it. This keeps `this.state` alive across re-renders.

**`setState` and `forceUpdate`.** Both are injected on every render call so they always close over the current instance and the live `rerender` function. `setState` does a shallow merge of the state patch (or calls the updater with prev state), then calls `rerender()`. `forceUpdate` calls `rerender()` without touching state. Both accept an optional callback fired after the update.

---

## `Suspense`

Implemented as a function component using `useState(0)` and `useCatch`. When a child throws a Promise, the catch handler increments the pending counter and attaches a `.then` that decrements it. The fallback is shown while the counter is above zero; children are shown when it reaches zero.

A counter (not a boolean flag) is used so that multiple concurrent promises are tracked independently — the fallback stays until **all** of them resolve.

---

## `flushSync`

Delegates to `withSyncRerender(renderRuntime, callback)`, which increments a sync-lock depth counter, runs the callback, then drains the sync rerender queue before returning. See [rerender.md](../core/rerender.md) for the full `withSyncRerender` flow.

---

## Hooks

| Hook | Implementation |
|---|---|
| `useState` | `createUseState(renderRuntime)` |
| `useEffect` / `useLayoutEffect` / `useInsertionEffect` | `createUseEffect(renderRuntime)` |
| `useRef` | `createUseRef(renderRuntime)` |
| `useReducer` | compat impl — stable dispatch via `useRef`, latest reducer also in a ref |
| `useMemo` | compat impl — cached value + deps stored in a `useRef` |
| `useCallback` | `useMemo(() => cb, deps)` |
| `useId` | compat impl — stable id per element via `useRef` + module-level counter |
| `useSyncExternalStore` | compat impl — subscribes in `useEffect`, snapshot in `useRef` |
| `useImperativeHandle` | compat impl — calls `init()` inside `useLayoutEffect` |
| `useContext` | `createUseContext(renderRuntime)` |
| `useDebugValue` | no-op |

---

## Context

`createContext` and `useContext` are direct wrappers over `createCreateContext(renderRuntime)` and `createUseContext(renderRuntime)` from `@simpreact/context`. They inherit all subscription and propagation behaviour from the core context module.

---

## DOM API

| Export | Implementation |
|---|---|
| `render(element, container)` | `createRenderer(renderRuntime)` |
| `createRoot(container)` | `createCreateRoot(renderRuntime)` |
| `hydrate` | `noop` — SSR hydration is not supported |

`render` and `createRoot().render` are functionally equivalent entry points.
