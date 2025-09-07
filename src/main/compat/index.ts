import coreDefault from './core.js';
import domDefault from './dom.js';
import hooksDefault from './hooks.js';
import jsxRuntimeDefault from './jsx-runtime.js';

export * from './core.js';
export * from './dom.js';
export * from './hooks.js';
export * from './jsx-runtime.js';

export default {
  ...coreDefault,
  ...domDefault,
  ...hooksDefault,
  ...jsxRuntimeDefault,
};
