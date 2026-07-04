import type { SimpRenderRuntime } from '@simpreact/internal';
import type { Executor } from 'react-executor/core';
import { attachExecutor } from './attach-executor.js';

export interface ExecutorFactory {
  /**
   * Subscribes the currently rendering component to the executor and returns it unchanged.
   * Called outside of rendering, it's a plain passthrough.
   *
   * Note: `executor.isActive` is not a reactive read — `activated`/`deactivated`
   * events do not trigger rerenders.
   */
  withExecutor<T>(exec: Executor<T>): Executor<T>;
}

export function createExecutorFactory(runtime: SimpRenderRuntime): ExecutorFactory {
  return {
    withExecutor: <T>(exec: Executor<T>): Executor<T> => attachExecutor(exec, runtime),
  };
}
