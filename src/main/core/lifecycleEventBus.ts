import type { SimpElement } from './createElement.js';
import type { SimpRenderRuntime } from './runtime.js';

export type LifecycleEvent =
  | {
      type: 'beforeRender';
      element: SimpElement;
      phase: 'mounting' | 'updating';
      renderRuntime: SimpRenderRuntime;
    }
  | {
      type: 'afterRender';
      element: SimpElement;
      phase: 'mounting' | 'updating';
      renderRuntime: SimpRenderRuntime;
    }
  | { type: 'triedToRerender'; element: SimpElement; renderRuntime: SimpRenderRuntime }
  | { type: 'mounted'; element: SimpElement; renderRuntime: SimpRenderRuntime }
  | { type: 'updated'; element: SimpElement; renderRuntime: SimpRenderRuntime }
  | { type: 'unmounted'; element: SimpElement; renderRuntime: SimpRenderRuntime }
  | {
      type: 'errored';
      element: SimpElement;
      error: any;
      phase: 'mounting' | 'updating';
      handled: boolean;
      renderRuntime: SimpRenderRuntime;
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
