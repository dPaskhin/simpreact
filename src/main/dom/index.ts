import { domAdapter } from './domAdapter.js';
import { htmlAttrAlias, sharedBooleanIdlAttrs, svgAttrsNamespaces, svgCamelToHyphen } from './props/attrMaps.js';
import { camelToKebab } from './props/style.js';
import { createCreateRoot, createRenderer } from './render.js';

export { createCreateRoot, createRenderer, domAdapter };
export { htmlAttrAlias, sharedBooleanIdlAttrs, svgAttrsNamespaces, svgCamelToHyphen, camelToKebab };

export default { createCreateRoot, createRenderer, domAdapter };

export type * from './public.js';
