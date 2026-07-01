import { rerender, type SimpElement, type SimpRenderRuntime } from '@simpreact/internal';

let activeDepCollector: Set<Signal<unknown>> | null = null;

export function collectDeps<T>(fn: () => T): [T, Set<Signal<unknown>>] {
  const prev = activeDepCollector;
  const deps = new Set<Signal<unknown>>();
  activeDepCollector = deps;
  let result: T;
  try {
    result = fn();
  } finally {
    activeDepCollector = prev;
  }
  return [result!, deps];
}

export class Signal<T> {
  #value: T;
  #subs = new Set<SimpElement>();
  #listeners = new Set<() => void>();
  readonly #runtime: SimpRenderRuntime;

  constructor(initial: T, runtime: SimpRenderRuntime) {
    this.#value = initial;
    this.#runtime = runtime;
  }

  get value(): T {
    const element = this.#runtime.activeRenderElement;
    if (element) {
      this.#subs.add(element);
    }
    activeDepCollector?.add(this as Signal<unknown>);
    return this.#value;
  }

  set value(next: T) {
    if (Object.is(this.#value, next)) {
      return;
    }

    this.#value = next;
    for (const element of this.#subs) {
      if (element.unmounted) {
        this.#subs.delete(element);
      } else {
        rerender(element, this.#runtime);
      }
    }
    // Snapshot before iterating: #recompute() unsubscribes and re-subscribes the same
    // dep, which would add a new entry to this Set mid-iteration and loop infinitely.
    for (const listener of [...this.#listeners]) {
      listener();
    }
  }

  /** @internal */
  _listen(fn: () => void): () => void {
    this.#listeners.add(fn);
    return () => this.#listeners.delete(fn);
  }
}
