import type { FunctionalComponent, SimpNode } from '@simpreact/core';

export interface ProviderProps<T> {
  value: T;
  children?: SimpNode;
}

export interface ConsumerProps<T> {
  children: (value: T) => SimpNode;
}

export type SimpContext<T> = {
  Provider: Provider<T>;
  Consumer: Consumer<T>;
};

export type ContextType<C extends SimpContext<any>> = C extends SimpContext<infer T> ? T : never;

export type Provider<T> = FunctionalComponent<ProviderProps<T>>;
export type Consumer<T> = FunctionalComponent<ConsumerProps<T>>;

export interface CreateContext {
  <T>(defaultValue: T): SimpContext<T>;
}

declare function createCreateContext(renderRuntime: SimpRenderRuntime): CreateContext;

export interface UseContext {
  <T>(context: SimpContext<T>): T;
}
declare function createUseContext(renderRuntime: SimpRenderRuntime): UseContext;
