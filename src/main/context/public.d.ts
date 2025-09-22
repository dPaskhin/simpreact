import type { FunctionComponent, SimpNode } from '@simpreact/core';

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

export type Provider<T> = FunctionComponent<ProviderProps<T>>;
export type Consumer<T> = FunctionComponent<ConsumerProps<T>>;

declare function createContext<T>(defaultValue: T): SimpContext<T>;

declare function useContext<T>(context: SimpContext<T>): T;
