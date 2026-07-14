import { registerLifecyclePlugin, type SimpRenderRuntime } from '@simpreact/internal';

const hydratingRuntimes = new WeakSet<SimpRenderRuntime>();
const excludedContainersByRuntime = new WeakMap<SimpRenderRuntime, WeakSet<object>>();

export function setHydrating(renderRuntime: SimpRenderRuntime, hydrating: boolean): void {
  if (hydrating) {
    hydratingRuntimes.add(renderRuntime);
  } else {
    hydratingRuntimes.delete(renderRuntime);
  }
}

export function isHydrating(renderRuntime: SimpRenderRuntime): boolean {
  return hydratingRuntimes.has(renderRuntime);
}

export function excludeFromHydration(renderRuntime: SimpRenderRuntime, container: object): void {
  let excluded = excludedContainersByRuntime.get(renderRuntime);
  if (!excluded) {
    excluded = new WeakSet();
    excludedContainersByRuntime.set(renderRuntime, excluded);
  }
  excluded.add(container);
}

export function isExcludedFromHydration(renderRuntime: SimpRenderRuntime, container: unknown): boolean {
  return excludedContainersByRuntime.get(renderRuntime)?.has(container as object) ?? false;
}

// Portals are never server-rendered, so their target container must never be treated as hydratable.
registerLifecyclePlugin(bus => {
  bus.subscribe(event => {
    if (event.type === 'portalMounted' && isHydrating(event.renderRuntime)) {
      excludeFromHydration(event.renderRuntime, event.container as object);
    }
  });
});
