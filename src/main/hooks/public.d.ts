import type { RefObject, SimpContext } from '@simpreact/core';

export type Cleanup = () => void;
export type Effect = () => void | Cleanup;
export type DependencyList = readonly unknown[];

declare function useRef<T>(initialValue: T): RefObject<T>;
declare function useRef<T>(initialValue: T | null): RefObject<T | null>;
declare function useRef<T>(initialValue: T | undefined): RefObject<T | undefined>;

declare function useRerender(): () => void;

declare function useEffect(effect: Effect, deps?: DependencyList): void;

declare function useMounted(effect: Effect): void;

declare function useUnmounted(cleanup: Cleanup): void;

declare function useContext<T>(context: SimpContext<T>): T;

declare function useCatch(cb: (error: any) => void): void;

declare function areDepsEqual(nextDeps: DependencyList | undefined, prevDeps: DependencyList | undefined): boolean;
