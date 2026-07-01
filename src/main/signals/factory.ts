import type { SimpRenderRuntime } from '@simpreact/internal';
import { ComputedSignal } from './computed.js';
import { Signal } from './signal.js';

export interface ReadonlySignal<T> {
  readonly value: T;
}

export interface WritableSignal<T> extends ReadonlySignal<T> {
  value: T;
}

export interface SignalFactory {
  signal<T>(initial: T): WritableSignal<T>;
  computed<T>(fn: () => T): ReadonlySignal<T>;
}

export function createSignalFactory(runtime: SimpRenderRuntime): SignalFactory {
  return {
    signal: <T>(initial: T): WritableSignal<T> => new Signal(initial, runtime),
    computed: <T>(fn: () => T): ReadonlySignal<T> => new ComputedSignal(fn, runtime),
  };
}
