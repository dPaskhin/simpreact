import type { RefObject, SimpContext } from '@simpreact/core';

export type Cleanup = () => void;
export type Effect = () => void | Cleanup;
export type DependencyList = readonly unknown[];

export type Dispatch<A> = (value: A) => void;
export type SetStateAction<S> = S | ((prevState: S) => S);

declare function useRef<T>(initialValue: T): RefObject<T>;
declare function useRef<T>(initialValue: T | null): RefObject<T | null>;
declare function useRef<T>(initialValue: T | undefined): RefObject<T | undefined>;

declare function useRerender(): () => void;

export function useState<S>(initialState: S | (() => S)): [S, Dispatch<SetStateAction<S>>];
export function useState<S = undefined>(): [S | undefined, Dispatch<SetStateAction<S | undefined>>];

declare function useEffect(effect: Effect, deps?: DependencyList): void;

declare function useMounted(effect: Effect): void;

declare function useUnmounted(cleanup: Cleanup): void;

declare function useContext<T>(context: SimpContext<T>): T;

declare function useCatch(cb: (error: any) => void): void;

declare function areDepsEqual(nextDeps: DependencyList | undefined, prevDeps: DependencyList | undefined): boolean;
