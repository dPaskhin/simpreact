import type { SimpElement, SimpRenderRuntime } from '@simpreact/core';

export interface RenderToStringOptions {
  /** A runtime from createSsrRenderRuntime() — the same instance any SSR-bound hooks use. */
  renderRuntime: SimpRenderRuntime;
}

export declare function renderToString(element: SimpElement, options: RenderToStringOptions): string;

export declare function createSsrRenderRuntime(): SimpRenderRuntime;
