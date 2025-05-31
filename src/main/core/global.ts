import type { HostAdapter } from './hostAdapter';
import type { SimpElement } from './createElement';
import { EventBus } from '../shared';

export type LifecycleEvent =
  | { type: 'beforeRender'; element: SimpElement }
  | { type: 'afterRender' }
  | { type: 'mounted'; element: SimpElement }
  | { type: 'unmounted'; element: SimpElement };

interface Global {
  hostAdapter: HostAdapter;
  eventBus: EventBus<LifecycleEvent>;
}

export const GLOBAL: Global = {
  hostAdapter: null!,
  eventBus: new EventBus<LifecycleEvent>(),
};
