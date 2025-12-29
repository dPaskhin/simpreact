import {
  normalizeRoot,
  SIMP_ELEMENT_CHILD_FLAG_UNKNOWN,
  SIMP_ELEMENT_FLAG_PORTAL,
  type SimpElement,
  type SimpNode,
} from './createElement.js';

export function createPortal(children: SimpNode, container: any): SimpElement {
  return normalizeRoot(
    {
      flag: SIMP_ELEMENT_FLAG_PORTAL,
      childFlag: SIMP_ELEMENT_CHILD_FLAG_UNKNOWN,
      parent: null,
      key: null,
      type: null,
      props: null,
      children: null,
      className: null,
      reference: null,
      store: null,
      context: null,
      ref: container,
      unmounted: null,
    },
    children,
    false
  );
}
