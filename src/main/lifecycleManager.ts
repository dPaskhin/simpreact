import { EventBus } from './EventBus';
import type { SimpElement } from './element';
import type { DiffResult, DiffTask } from './diff';

export class LifecycleManager {
  private _eventBus = new EventBus<LifecycleEvent>();

  requireMount(tasks: DiffTask[]): void {
    this._eventBus.publish({ type: 'mountRequired', payload: { tasks } });
  }

  beforeRender(element: SimpElement) {
    this._eventBus.publish({ type: 'beforeRender', payload: { element } });
  }

  afterRender(element: SimpElement) {
    this._eventBus.publish({ type: 'afterRender', payload: { element } });
  }

  afterMount(params: DiffResult): void {
    this._eventBus.publish({ type: 'afterMount', payload: params });
  }

  subscribe(listener: (event: LifecycleEvent) => void): () => void {
    return this._eventBus.subscribe(listener);
  }
}

interface BaseEvent<Type extends string, Payload = any> {
  type: Type;
  payload: Payload;
}

export type LifecycleEvent =
  | BaseEvent<'beforeRender', { element: SimpElement }>
  | BaseEvent<'afterRender', { element: SimpElement }>
  | BaseEvent<'afterMount', DiffResult>
  | BaseEvent<'mountRequired', { tasks: DiffTask[] }>;

export const lifecycleManager = new LifecycleManager();
