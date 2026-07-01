import { collectDeps, type Signal } from './signal.js';

class Effect {
  readonly #fn: () => void | (() => void);
  readonly #deps = new Map<Signal<unknown>, () => void>();
  #cleanup: (() => void) | void = undefined;
  #disposed = false;

  constructor(fn: () => void | (() => void)) {
    this.#fn = fn;
    this.#run();
  }

  #run(): void {
    if (typeof this.#cleanup === 'function') {
      this.#cleanup();
    }

    for (const unlisten of this.#deps.values()) {
      unlisten();
    }
    this.#deps.clear();

    const [cleanup, newDeps] = collectDeps(this.#fn);
    this.#cleanup = cleanup;

    for (const dep of newDeps) {
      this.#deps.set(
        dep,
        dep._listen(() => {
          if (!this.#disposed) {
            this.#run();
          }
        })
      );
    }
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    if (typeof this.#cleanup === 'function') {
      this.#cleanup();
    }
    this.#cleanup = undefined;
    for (const unlisten of this.#deps.values()) {
      unlisten();
    }
    this.#deps.clear();
  }
}

export function effect(fn: () => void | (() => void)): () => void {
  const e = new Effect(fn);
  return () => e.dispose();
}
