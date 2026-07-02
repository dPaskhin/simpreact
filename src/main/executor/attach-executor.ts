import { registerLifecyclePlugin, rerender, type SimpElement, type SimpRenderRuntime } from '@simpreact/internal';
import type { Executor } from 'react-executor/core';

const SKIP_EVENTS = new Set<string>(['attached', 'detached', 'activated', 'deactivated', 'plugin_configured']);

const subsByExecutor = new WeakMap<Executor<any>, Map<SimpElement, SimpRenderRuntime>>();
const executorsByElement = new WeakMap<SimpElement, Map<Executor<any>, () => void>>();

registerLifecyclePlugin(bus => {
  bus.subscribe(event => {
    // 'errored' elements are abandoned by the engine without an 'unmounted' event,
    // so both events mean the element will never render again.
    if (event.type !== 'unmounted' && event.type !== 'errored') {
      return;
    }

    const executors = executorsByElement.get(event.element);

    if (!executors) {
      return;
    }

    executorsByElement.delete(event.element);

    for (const [executor, deactivate] of executors) {
      subsByExecutor.get(executor)?.delete(event.element);
      deactivate();
    }
  });
});

export function attachExecutor<T>(executor: Executor<T>, runtime: SimpRenderRuntime): Executor<T> {
  const element = runtime.activeRenderElement;

  if (!element) {
    return executor;
  }

  let subs = subsByExecutor.get(executor);

  if (!subs) {
    const newSubs = new Map<SimpElement, SimpRenderRuntime>();

    subsByExecutor.set(executor, newSubs);
    subs = newSubs;

    executor.subscribe(event => {
      // ExecutorManager.detach() force-unsubscribes this listener right after
      // publishing 'detached'; drop the registry entry so a later attach knows
      // to re-subscribe. Detach is only possible with no active subscribers,
      // so there are no activations left to release here.
      if (event.type === 'detached') {
        subsByExecutor.delete(executor);
        return;
      }
      if (SKIP_EVENTS.has(event.type)) {
        return;
      }
      for (const [el, elRuntime] of newSubs) {
        rerender(el, elRuntime);
      }
    });
  }

  if (!subs.has(element)) {
    subs.set(element, runtime);

    let executors = executorsByElement.get(element);

    if (!executors) {
      executors = new Map();
      executorsByElement.set(element, executors);
    }

    // The executor ref-counts activations itself, so each subscribed element
    // holds one activation, released when the element unmounts or errors.
    executors.set(executor, executor.activate());
  }

  return executor;
}
