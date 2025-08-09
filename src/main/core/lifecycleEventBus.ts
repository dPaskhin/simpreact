import { EventBus } from '@simpreact/shared';

import type { SimpElement } from './createElement';

export type LifecycleEvent =
  | { type: 'beforeRender'; element: SimpElement }
  | { type: 'afterRender' }
  | { type: 'mounted'; element: SimpElement }
  | { type: 'updated'; element: SimpElement }
  | { type: 'unmounted'; element: SimpElement }
  | { type: 'errored'; element: SimpElement; error: any };

export type LifecycleEventBus = EventBus<LifecycleEvent>;

export const lifecycleEventBus = new EventBus<LifecycleEvent>();
