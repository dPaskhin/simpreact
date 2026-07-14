# simpreact

**simpreact** is a lightweight React-like virtual DOM library written in TypeScript. It implements an iterative (non-recursive) mount/patch/unmount engine, hooks (`useState`, `useEffect`, `useRef`, ...), context, portals, `memo`, refs, and a JSX runtime compatible with React's automatic JSX transform.

A `@simpreact/compat` layer makes it usable as a drop-in for React 18 code — `createElement`, hooks, `createContext`, `render`/`createRoot`, class components, `Suspense`, `forwardRef`. `@simpreact/ssr` renders to an HTML string on the server, and `createHydrateRoot` (from `@simpreact/dom`) adopts that markup on the client instead of re-creating it. `@simpreact/signals` adds fine-grained reactivity on top of the same render runtime. Published as an ESM-only package with subpath exports per module.

## Documentation

**Core**
- [Element Structure](docs/core/element-structure.md)
- [Mounting](docs/core/mounting.md)
- [Patching](docs/core/patching.md)
- [Unmounting](docs/core/unmounting.md)
- [Rerender](docs/core/rerender.md)
- [Process Stack](docs/core/process-stack.md)
- [Lifecycle Event Bus](docs/core/lifecycle-bus.md)

**Compat**
- [Compat Layer](docs/compat/compat.md)

**Signals**
- [Signals](docs/signals/signals.md)
