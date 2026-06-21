import '../../../lib/hooks/index.js';
import { createRenderRuntime } from '../../../lib/core/internal.js';
import { createUseState } from '../../../lib/hooks/index.js';

export const perfHostAdapter = {
  createReference: () => ({}),
  createTextReference: () => ({}),
  insertOrAppend: () => {},
  removeChild: () => {},
  replaceChild: () => {},
  clearNode: () => {},
  setTextContent: () => {},
  mountProps: () => {},
  patchProps: () => {},
  unmountProps: () => {},
  setClassname: () => {},
  attachElementToReference: (el, ref) => {
    ref.__el = el;
  },
  getElementFromReference: ref => ref.__el ?? null,
  detachElementFromReference: ref => {
    ref.__el = null;
  },
  getHostNamespaces: () => ({ self: '', children: '' }),
};

export const renderRuntime = createRenderRuntime(perfHostAdapter, (type, element) => type(element.props ?? {}));

export const useState = createUseState(renderRuntime);
