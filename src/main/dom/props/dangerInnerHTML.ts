import type { Maybe } from '@simpreact/shared';
import type { SimpElement } from '@simpreact/internal';
import { unmount, unmountAllChildren } from '@simpreact/internal';

export function patchDangerInnerHTML(
  prevValue: Maybe<{ __html: string }>,
  nextValue: Maybe<{ __html: string }>,
  prevElement: Maybe<SimpElement>,
  nextElement: SimpElement,
  dom: Element
): void {
  const prevHTML = prevValue?.__html || '';
  const nextHTML = nextValue?.__html || '';

  if (nextElement.children) {
    console.warn(
      'Avoid setting both children and props.dangerouslySetInnerHTML at the same time — this can cause unpredictable behavior.'
    );
  }

  if (prevHTML !== nextHTML) {
    if (nextHTML != null && !isSameInnerHTML(dom, nextHTML)) {
      if (prevElement != null) {
        if (Array.isArray(prevElement.children)) {
          unmountAllChildren(prevElement.children as SimpElement[]);
        } else if (prevElement.children) {
          unmount(prevElement.children as SimpElement);
        }
        prevElement.children = undefined;
      }
      dom.innerHTML = nextHTML;
    }
  }
}

function isSameInnerHTML(dom: Element, innerHTML: string): boolean {
  const temp = document.createElement('i');

  temp.innerHTML = innerHTML;
  return temp.innerHTML === dom.innerHTML;
}
