import type { FC, SimpNode } from '@simpreact/core';

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

export function componentRenderer(component: FC, element: SimpElement): SimpNode;
