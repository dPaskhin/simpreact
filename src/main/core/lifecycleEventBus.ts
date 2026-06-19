import type { SimpElement } from './createElement.js';
import type { SimpRenderRuntime } from './runtime.js';

export type LifecycleEvent =
  | {
      type: 'beforeRender';
      element: SimpElement;
      renderRuntime: SimpRenderRuntime;
    }
  | {
      type: 'afterRender';
      element: SimpElement;
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
      handled: boolean;
      renderRuntime: SimpRenderRuntime;
    };

type Subscriber = (event: LifecycleEvent) => boolean | void;

export interface LifecycleEventBus {
  publish(event: LifecycleEvent): void;
  subscribe(subscriber: Subscriber): () => void;
}

function createBus(): LifecycleEventBus {
  const subscribers: Subscriber[] = [];

  return {
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
        const index = subscribers.indexOf(subscriber);
        if (index !== -1) subscribers.splice(index, 1);
      };
    },
  };
}

const busByRuntime = new WeakMap<SimpRenderRuntime, LifecycleEventBus>();
const plugins: Array<(bus: LifecycleEventBus) => void> = [];

export function getLifecycleEventBus(runtime: SimpRenderRuntime): LifecycleEventBus {
  let bus = busByRuntime.get(runtime);
  if (!bus) {
    bus = createBus();
    for (const plugin of plugins) plugin(bus);
    busByRuntime.set(runtime, bus);
  }
  return bus;
}

export function registerLifecyclePlugin(plugin: (bus: LifecycleEventBus) => void): void {
  plugins.push(plugin);
}
