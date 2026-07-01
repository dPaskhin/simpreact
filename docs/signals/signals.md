# Signals

`@simpreact/signals` adds fine-grained reactivity to simpreact. A signal holds a value; any FC that reads it during render automatically subscribes. When the value changes, only the subscribed components re-render.

## Setup

The signal factory closes over a `SimpRenderRuntime` — the same one the application already owns. Pass it once at startup alongside the other runtime consumers:

```ts
import { createRenderRuntime } from '@simpreact/internal';
import { domAdapter, createCreateRoot } from '@simpreact/dom';
import { createSignalFactory } from '@simpreact/signals';

const renderRuntime = createRenderRuntime(domAdapter, renderer);
const createRoot = createCreateRoot(renderRuntime);
const { signal, computed } = createSignalFactory(renderRuntime);
```

If you use `@simpreact/compat`, import its pre-created `renderRuntime` directly:

```ts
import { renderRuntime } from '@simpreact/compat/renderRuntime';
import { createSignalFactory } from '@simpreact/signals';

const { signal, computed } = createSignalFactory(renderRuntime);
```

---

## `signal(initialValue)`

Returns a `WritableSignal<T>`. Read and write through `.value`:

```ts
const count = signal(0);

count.value;      // read
count.value = 1;  // write
count.value++;    // increment
count.value += 5; // any assignment operator works
```

Signals are typically created at module scope or inside a store object — outside the component tree.

### Subscribing from a component

Reading `.value` inside a component's render function is all that is needed:

```ts
const count = signal(0);

function Counter() {
  return (
    <button onClick={() => count.value++}>
      {count.value}
    </button>
  );
}
```

The component re-renders whenever `count.value` changes. Unlike hooks, signals can be read inside loops and conditionals without restriction — subscription happens at read time, not via a slot:

```ts
const activeId = signal<string | null>(null);

function Tabs({ tabs }: { tabs: { id: string; label: string }[] }) {
  return (
    <nav>
      {tabs.map(tab => (
        <button
          key={tab.id}
          class={activeId.value === tab.id ? 'active' : ''}
          onClick={() => { activeId.value = tab.id; }}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
```

---

## `computed(fn)`

Returns a `ReadonlySignal<T>` whose value is derived from other signals. It re-evaluates automatically when any signal read inside `fn` changes.

```ts
const price = signal(100);
const qty = signal(3);
const total = computed(() => price.value * qty.value);

total.value; // 300
price.value = 200;
total.value; // 600
```

Computed signals can depend on other computed signals:

```ts
const discounted = computed(() => total.value * 0.9);
```

---

## `effect(fn)`

Runs `fn` immediately, auto-tracks every signal read inside it, and re-runs whenever any of those signals change. Returns a dispose function that stops the effect and runs the final cleanup.

```ts
import { effect } from '@simpreact/signals';

const count = signal(0);

const dispose = effect(() => {
  console.log('count is', count.value);
});
// → logs "count is 0"

count.value = 1; // → logs "count is 1"
count.value = 2; // → logs "count is 2"

dispose(); // stops the effect
```

`fn` may return a cleanup function. It runs before each re-execution and on dispose:

```ts
const dispose = effect(() => {
  const id = setInterval(() => console.log(count.value), 1000);
  return () => clearInterval(id);
});
```

`effect` is a standalone export — it does not need the render runtime and does not depend on the factory:

```ts
import { createSignalFactory, effect } from '@simpreact/signals';
```

---

## Caveats

**One runtime per signal factory.** All signals from a factory share a single runtime. If your app has multiple independent roots with separate runtimes, create a separate factory for each:

```ts
const signals1 = createSignalFactory(runtime1);
const signals2 = createSignalFactory(runtime2);
```

Signals from `signals1` will not trigger re-renders in components rendered under `runtime2`, and vice versa.

**Reads outside render do not subscribe.** Reading `.value` in an event handler, a `useEffect` callback, or any context outside a component's active render phase reads the value without subscribing:

```ts
function handleClick() {
  console.log(count.value); // reads value, no subscription created
}
```

**`Object.is` equality.** Assigning the same value does nothing — no re-render, no computed re-evaluation. Mutating an object in place and re-assigning the same reference will not trigger updates:

```ts
const state = signal({ count: 0 });

// Does NOT trigger an update — same reference:
state.value.count++;
state.value = state.value;

// Does trigger an update — new reference:
state.value = { ...state.value, count: state.value.count + 1 };
```

**Computed deps are tracked per evaluation.** If `fn` reads different signals on different runs (e.g. behind a conditional), the dependency set updates accordingly. A signal that is no longer read will stop triggering recomputation:

```ts
const toggle = signal(true);
const a = signal(1);
const b = signal(2);

const value = computed(() => toggle.value ? a.value : b.value);
// Currently depends on: toggle, a

toggle.value = false;
// Now depends on: toggle, b — no longer depends on a
```
