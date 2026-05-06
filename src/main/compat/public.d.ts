import type { SimpContext } from '@simpreact/context';
import type {
  Attributes,
  FC,
  FunctionalComponent,
  Key,
  Ref,
  RefAttributes,
  RefObject,
  SimpElement,
  SimpNode,
  SimpRenderRuntime,
} from '@simpreact/core';
import type { SimpRoot } from '@simpreact/dom';
import type { Dispatch, SetStateAction } from '@simpreact/hooks';
import type { DependencyList, Effect, Maybe, Nullable } from '@simpreact/shared';

export type { SimpContext } from '@simpreact/context';
export type {
  Attributes,
  FC,
  FunctionalComponent,
  Key,
  Ref,
  RefAttributes,
  RefObject,
  SimpElement,
  SimpNode,
  SimpRenderRuntime,
} from '@simpreact/core';
export type { SimpRoot } from '@simpreact/dom';
export type { Dispatch, SetStateAction } from '@simpreact/hooks';
export type { DependencyList, Effect, Maybe, Nullable } from '@simpreact/shared';

export declare const renderRuntime: SimpRenderRuntime;

export declare function jsx<P = {}>(type: string | FC<P>, props?: P, key?: Maybe<Key>): SimpElement<P>;
export declare function jsxs<P = {}>(type: string | FC<P>, props?: P, key?: Maybe<Key>): SimpElement<P>;
export declare function jsxDEV<P = {}>(type: string | FC<P>, props?: P, key?: Maybe<Key>): SimpElement<P>;

export declare function useSyncExternalStore<T>(
  subscribe: (callback: () => void) => () => void,
  getSnapshot: () => T
): T;
export declare function useReducer<R extends (state: any, action: any) => any, I>(
  reducer: R,
  initializerArg: I,
  initializer?: (arg: I) => ReturnType<R>
): [ReturnType<R>, (action: Parameters<R>[1]) => void];
export declare function useId(prefix?: string): string;
export declare function useMemo<T>(factory: () => T, deps: DependencyList): T;
export declare function useCallback<T>(cb: T, deps: DependencyList): T;
export declare function useState<S>(initialState: S | (() => S)): [S, Dispatch<SetStateAction<S>>];
export declare function useState<S>(): [S | undefined, Dispatch<SetStateAction<S | undefined>>];
export declare function useEffect(effect: Effect, deps?: DependencyList): void;
export declare function useLayoutEffect(effect: Effect, deps?: DependencyList): void;
export declare function useInsertionEffect(effect: Effect, deps?: DependencyList): void;
export declare function useRef<T>(initialValue: T): RefObject<T>;
export declare function useRef<T>(initialValue: T | null): RefObject<T | null>;
export declare function useRef<T = undefined>(initialValue?: T): RefObject<T | undefined>;
export declare function useCatch(errorBoundary: FC): [Error | null, (error: Error) => void];

export declare function hydrate(): void;
export declare function render(element: SimpElement, parentReference: Nullable<HTMLElement>): void;
export declare function createRoot(container: Element | DocumentFragment): SimpRoot;

export declare const Children: {
  map(children: SimpNode, fn: (child: SimpNode, index: number) => SimpNode): SimpNode[];
  forEach(children: SimpNode, fn: (child: SimpNode, index: number) => void): void;
  count(children: SimpNode): number;
  toArray(children: SimpNode): SimpNode[];
  only(children: SimpNode): SimpElement;
};

export declare function cloneElement(element: SimpElement, props?: any, ...children: SimpNode[]): SimpElement;
export declare function isValidElement(element: unknown): element is SimpElement;
export declare function Suspense(props: { fallback: SimpNode; children: SimpNode }): SimpNode;
export declare function StrictMode(props: { children: SimpNode }): SimpNode;
export declare function forwardRef<P, T>(Component: (props: P, ref: Ref<T>) => any): FC;
export declare function Fragment(props: { children?: SimpNode }): SimpNode;

export declare function createElement<P extends {}, T>(
  type: string,
  props?: (RefAttributes<T> & P) | null,
  ...children: SimpNode[]
): SimpElement<P>;
export declare function createElement<P extends {}>(
  type: FunctionalComponent<P>,
  props?: (Attributes & P) | null,
  ...children: SimpNode[]
): SimpElement<P>;

export declare function createPortal(children: SimpNode, container: any): SimpElement;

export declare function memo(Component: FC, compare: (objA: any, objB: any) => boolean): FC;
export declare function flushSync(value: any): any;

export declare class Component {}

export declare function createContext<T>(defaultValue: T): SimpContext<T>;
export declare function useContext<T>(context: SimpContext<T>): T;
