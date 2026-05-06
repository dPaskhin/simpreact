import type { FC, SimpElement, SimpNode } from '@simpreact/core';
import type { DependencyList, Effect } from '@simpreact/shared';

export interface ComponentRenderContext<S = {}> {
  state: S;
  rerender: () => void;
  effects: Array<{ effect: Effect; deps?: DependencyList }>;
  catchers: Array<(error: any) => void>;
}

export declare function component<P = {}, S = {}>(
  Component: (props: P, ctx: ComponentRenderContext<S>) => SimpNode
): FC<P>;

export declare function componentRenderer(component: FC, element: SimpElement): SimpNode;
