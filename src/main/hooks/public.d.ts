import type { RefObject, SimpRenderRuntime } from '@simpreact/core';

export type Cleanup = () => void;
export type Effect = () => void | Cleanup;
export type DependencyList = readonly unknown[];

export type Dispatch<A> = (value: A) => void;
export type SetStateAction<S> = S | ((prevState: S) => S);

export interface UseRef {
  <T>(initialValue: T): RefObject<T>;
  <T>(initialValue: T | null): RefObject<T | null>;
  <T = undefined>(initialValue?: T): RefObject<T | undefined>;
}
declare function createUseRef(renderRuntime: SimpRenderRuntime): UseRef;

declare function createUseRerender(renderRuntime: SimpRenderRuntime): () => void;

export interface UseState {
  <S>(initialState: S | (() => S)): [S, Dispatch<SetStateAction<S>>];
  <S>(): [S | undefined, Dispatch<SetStateAction<S | undefined>>];
}
declare function createUseState(renderRuntime: SimpRenderRuntime): useState;

declare function createUseEffect(renderRuntime: SimpRenderRuntime): (effect: Effect, deps?: DependencyList) => void;

declare function createUseCatch(renderRuntime: SimpRenderRuntime): (cb: (error: any) => void) => void;

declare function areDepsEqual(nextDeps: DependencyList | undefined, prevDeps: DependencyList | undefined): boolean;
