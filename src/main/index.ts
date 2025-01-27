export type { SimpElement, FunctionComponent, FC, SimpNode } from './element/types';
export { createElement, Fragment } from './element';

export { lifecycleManager, type LifecycleEvent } from './lifecycleManager';
export { enqueueRender } from './enqueueRender';
export { createContext } from './context';
