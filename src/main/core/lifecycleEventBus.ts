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
      handled: boolean;
    };

type Subscriber = (event: LifecycleEvent) => boolean | void;

const subscribers: Subscriber[] = [];

export const lifecycleEventBus = {
  publish(event: LifecycleEvent) {
    for (const subscriber of subscribers) {
      subscriber(event);
    }
  },

  subscribe(subscriber: Subscriber): () => void {
    if (subscribers.indexOf(subscriber) === -1) {
      subscribers.push(subscriber);
    }
    return () => {
      subscribers.splice(subscribers.indexOf(subscriber), 1);
    };
  },
};
