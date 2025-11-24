import { EventBus } from '@simpreact/shared';

import type { SimpElement } from './createElement.js';

export type LifecycleEvent =
  | {
      type: 'beforeRender';
      element: SimpElement;
      phase: 'mounting' | 'updating';
    }
  | {
      type: 'afterRender';
      element: SimpElement;
      phase: 'mounting' | 'updating';
    }
  | { type: 'triedToRerender'; element: SimpElement }
  | { type: 'mounted'; element: SimpElement }
  | { type: 'updated'; element: SimpElement }
  | { type: 'unmounted'; element: SimpElement }
  | {
      type: 'errored';
      element: SimpElement;
      error: any;
      phase: 'mounting' | 'updating';
    };

export const lifecycleEventBus = new EventBus<LifecycleEvent>();
