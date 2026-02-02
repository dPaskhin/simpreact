import type { SimpText } from '@simpreact/shared';

export type ComponentType<P = {}> = FunctionalComponent<P>;

export type RefObject<T> = { current: T };
export type RefCallback<T> = {
  bivarianceHack(instance: T): (() => void | undefined) | void;
}['bivarianceHack'];
export type Ref<T> = RefCallback<T> | RefObject<T | null> | null;

export type Key = string | number | bigint;

export interface Attributes {
  key?: Key | null | undefined;
}

export interface RefAttributes<T> extends Attributes {
  ref?: Ref<T> | undefined;
}

export interface SimpElement<P = unknown, T extends string | FunctionalComponent<P> = string> {
  type?: T;
  props?: P;
  key?: string | null;
}

export type SimpNode = SimpElement | SimpText | Array<SimpNode> | boolean | null | undefined;

declare function createElement<P extends {}, T>(
  type: string,
  props?: (RefAttributes<T> & P) | null,
  ...children: SimpNode[]
): SimpElement<P>;
declare function createElement<P extends {}>(
  type: FunctionalComponent<P>,
  props?: (Attributes & P) | null,
  ...children: SimpNode[]
): SimpElement<P>;

declare function createPortal<HostRef = {}>(children: SimpNode, container: HostRef): SimpElement;

declare function Fragment(props: PropsWithChildren): SimpElement;

export type FunctionalComponent<P = {}> = (props: P) => SimpNode;
export type FC<P = {}> = FunctionalComponent<P>;

export type PropsWithChildren<P = {}> = P & { children?: SimpNode | undefined };

declare function memo<P = {}>(Component: FC<P>, compare?: (objA: Readonly<P>, objB: Readonly<P>) => boolean): FC<P>;

export type Cleanup = () => void;
export type Effect = () => void | Cleanup;
export type DependencyList = readonly unknown[];

export interface ComponentRenderContext<S = {}> {
  state: S;
  rerender: () => void;
  effects: Array<{ effect: Effect; deps?: DependencyList }>;
  catchers: Array<(error: any) => void>;
}

declare function component<P = {}, S = {}>(Component: (props: P, ctx: ComponentRenderContext<S>) => SimpNode): FC<P>;

export interface SimpRuntimeFCRenderer {
  (component: FC, element: SimpElement): SimpNode;
}

export interface SimpRenderRuntime {
  hostAdapter: HostAdapter;
  renderer: SimpRuntimeFCRenderer;
}
