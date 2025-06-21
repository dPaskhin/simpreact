import { EventBus } from '@simpreact/shared';

import type { SimpElement } from './createElement';

export type LifecycleEvent =
  | { type: 'beforeRender'; element: SimpElement }
  | { type: 'afterRender' }
  | { type: 'mounted'; element: SimpElement }
  | { type: 'unmounted'; element: SimpElement };

export type LifecycleEventBus = EventBus<LifecycleEvent>;

export const lifecycleEventBus = new EventBus<LifecycleEvent>();
