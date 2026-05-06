import type { RefObject, SimpRenderRuntime } from '@simpreact/core';
import type { DependencyList, Effect } from '@simpreact/shared';

export type Dispatch<A> = (value: A) => void;
export type SetStateAction<S> = S | ((prevState: S) => S);

export interface UseRef {
  <T>(initialValue: T): RefObject<T>;
  <T>(initialValue: T | null): RefObject<T | null>;
  <T = undefined>(initialValue?: T): RefObject<T | undefined>;
}
export declare function createUseRef(renderRuntime: SimpRenderRuntime): UseRef;

export declare function createUseRerender(renderRuntime: SimpRenderRuntime): () => void;

export interface UseState {
  <S>(initialState: S | (() => S)): [S, Dispatch<SetStateAction<S>>];
  <S>(): [S | undefined, Dispatch<SetStateAction<S | undefined>>];
}
export declare function createUseState(renderRuntime: SimpRenderRuntime): UseState;

export declare function createUseEffect(
  renderRuntime: SimpRenderRuntime
): (effect: Effect, deps?: DependencyList) => void;

export declare function createUseCatch(renderRuntime: SimpRenderRuntime): (cb: (error: any) => void) => void;

export declare function areDepsEqual(
  nextDeps: DependencyList | undefined,
  prevDeps: DependencyList | undefined
): boolean;
