import type { SimpText } from '@simpreact/shared';

export type ComponentType<P = {}> = FunctionComponent<P>;

export type RefObject<T> = { current: T };
export type RefCallback<T> = {
  bivarianceHack(instance: T | null): (() => void | undefined) | void;
}['bivarianceHack'];
export type Ref<T> = RefCallback<T> | RefObject<T> | null;

export type Key = string | number | bigint;

export interface Attributes {
  key?: Key | null | undefined;
}

export interface RefAttributes<T> extends Attributes {
  ref?: Ref<T> | undefined;
}

export interface SimpElement<P = unknown, T extends string | FunctionComponent<P> = string> {
  type?: T;
  props?: P;
  key?: string | null;
}

export type SimpNode = SimpElement | SimpText | Array<SimpNode> | boolean | null | undefined;

export interface ProviderProps<T> {
  value: T;
  children?: SimpNode | undefined;
}

export interface ConsumerProps<T> {
  children: (value: T) => SimpNode;
}

export type SimpContext<T> = {
  Provider: Provider<T>;
  Consumer: Consumer<T>;
};

export type ContextType<C extends SimpContext<any>> = C extends SimpContext<infer T> ? T : never;

export type Provider<T> = FunctionComponent<ProviderProps<T>>;
export type Consumer<T> = FunctionComponent<ConsumerProps<T>>;

declare function createElement<P extends {}, T>(
  type: string,
  props?: (RefAttributes<T> & P) | null,
  ...children: SimpNode[]
): SimpElement<P>;
declare function createElement<P extends {}>(
  type: FunctionComponent<P>,
  props?: (Attributes & P) | null,
  ...children: SimpNode[]
): SimpElement<P>;

declare function createPortal<HostRef = {}>(children: SimpNode, container: HostRef): SimpElement;

declare function createContext<T>(defaultValue: T): SimpContext<T>;

declare function Fragment(props: PropsWithChildren): SimpElement;

export type FunctionComponent<P = {}> = (props: P) => SimpNode;
export type FC<P = {}> = FunctionComponent<P>;

export type PropsWithChildren<P = {}> = P & { children?: SimpNode | undefined };
