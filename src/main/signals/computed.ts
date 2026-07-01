import type { SimpRenderRuntime } from '@simpreact/internal';
import { collectDeps, Signal } from './signal.js';

export class ComputedSignal<T> extends Signal<T> {
  readonly #fn: () => T;
  readonly #deps = new Map<Signal<unknown>, () => void>();

  constructor(fn: () => T, runtime: SimpRenderRuntime) {
    const [initialValue, initialDeps] = collectDeps(fn);
    super(initialValue, runtime);
    this.#fn = fn;
    for (const dep of initialDeps) {
      this.#subscribeToDep(dep);
    }
  }

  #subscribeToDep(dep: Signal<unknown>): void {
    if (!this.#deps.has(dep)) {
      const unlisten = dep._listen(() => this.#recompute());
      this.#deps.set(dep, unlisten);
    }
  }

  #recompute(): void {
    for (const unlisten of this.#deps.values()) {
      unlisten();
    }
    this.#deps.clear();

    const [next, newDeps] = collectDeps(this.#fn);

    for (const dep of newDeps) {
      this.#subscribeToDep(dep);
    }

    this.value = next;
  }
}
