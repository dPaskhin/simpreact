import { domAdapter } from '@simpreact/dom';
import { createUseEffect, createUseRef, createUseRerender } from '@simpreact/hooks';
import { createRenderRuntime } from '@simpreact/internal';
import { emptyObject } from '@simpreact/shared';

// Lazily assigned after renderRuntime is created to avoid a circular reference
// at module-evaluation time. All are set before any render can fire.
let useRef;
let useRerender;
let useLayoutEffect;

export const renderRuntime = createRenderRuntime(domAdapter, function renderer(component, element) {
  const props = element.props || emptyObject;
  const proto = component.prototype;

  if (proto?.isReactComponent || proto?.render) {
    // Persist the instance across re-renders so state is not reset on every
    // render cycle. Hook calls run in the current FC render context.
    const instRef = useRef(null);
    const rerender = useRerender();

    if (instRef.current === null) {
      instRef.current = new component(props);
      if (instRef.current.state == null) {
        instRef.current.state = {};
      }
    }

    const inst = instRef.current;
    inst.props = props;

    // Override the no-op stubs from Component base with real implementations.
    inst.setState = function (updater, callback) {
      const prevState = inst.state;
      const patch = typeof updater === 'function' ? updater(prevState, inst.props) : updater;
      inst.state = Object.assign({}, prevState, patch);
      rerender();
      callback?.();
    };

    inst.forceUpdate = function (callback) {
      rerender();
      callback?.();
    };

    useLayoutEffect(() => {
      if (typeof inst.componentDidMount === 'function') {
        inst.componentDidMount();
      }
    }, []);

    return inst.render();
  }

  return component(props);
});

useRef = createUseRef(renderRuntime);
useRerender = createUseRerender(renderRuntime);
useLayoutEffect = createUseEffect(renderRuntime);

export default {
  renderRuntime,
};
