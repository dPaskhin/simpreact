import { EventBus } from '@simpreact/shared';

import type { SimpElement } from './createElement.js';

export type LifecycleEvent =
  | { type: 'beforeRender'; element: SimpElement; phase: 'mounting' | 'updating' }
  | { type: 'afterRender'; phase: 'mounting' | 'updating' }
  | { type: 'mounted'; element: SimpElement }
  | { type: 'updated'; element: SimpElement }
  | { type: 'unmounted'; element: SimpElement }
  | { type: 'errored'; element: SimpElement; error: any; phase: 'mounting' | 'updating' };

export type LifecycleEventBus = EventBus<LifecycleEvent>;

export const lifecycleEventBus = new EventBus<LifecycleEvent>();
