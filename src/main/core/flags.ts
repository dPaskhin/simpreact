export const SIMP_ELEMENT_FLAG_HOST = 1;
export const SIMP_ELEMENT_FLAG_FC = 1 << 1;
export const SIMP_ELEMENT_FLAG_TEXT = 1 << 2;
export const SIMP_ELEMENT_FLAG_PORTAL = 1 << 3;
export const SIMP_ELEMENT_FLAG_FRAGMENT = 1 << 4;

export const SIMP_ELEMENT_CHILD_FLAG_EMPTY = 1;
export const SIMP_ELEMENT_CHILD_FLAG_UNKNOWN = 1 << 1;
export const SIMP_ELEMENT_CHILD_FLAG_ELEMENT = 1 << 2;
export const SIMP_ELEMENT_CHILD_FLAG_LIST = 1 << 3;
export const SIMP_ELEMENT_CHILD_FLAG_TEXT = 1 << 4;

export function isFC(element: { flag: number }): boolean {
  return (element.flag & SIMP_ELEMENT_FLAG_FC) !== 0;
}

export function isFragment(element: { flag: number }): boolean {
  return (element.flag & SIMP_ELEMENT_FLAG_FRAGMENT) !== 0;
}

export function isHost(element: { flag: number }): boolean {
  return (element.flag & SIMP_ELEMENT_FLAG_HOST) !== 0;
}

export function isPortal(element: { flag: number }): boolean {
  return (element.flag & SIMP_ELEMENT_FLAG_PORTAL) !== 0;
}

export function isText(element: { flag: number }): boolean {
  return (element.flag & SIMP_ELEMENT_FLAG_TEXT) !== 0;
}

export function hasListChildren(element: { childFlag: number }): boolean {
  return element.childFlag === SIMP_ELEMENT_CHILD_FLAG_LIST;
}

export function hasElementChild(element: { childFlag: number }): boolean {
  return element.childFlag === SIMP_ELEMENT_CHILD_FLAG_ELEMENT;
}
