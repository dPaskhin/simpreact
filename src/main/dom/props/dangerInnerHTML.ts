import type { SimpElement, SimpRenderRuntime } from '@simpreact/internal';
import { unmount } from '@simpreact/internal';
import type { Maybe } from '@simpreact/shared';

export function patchDangerInnerHTML(
  prevValue: Maybe<{ __html: string }>,
  nextValue: Maybe<{ __html: string }>,
  prevElement: Maybe<SimpElement>,
  nextElement: SimpElement,
  dom: Element,
  renderRuntime: SimpRenderRuntime
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
        if (prevElement.children) {
          // TODO: the HOST element can hold several children.
          unmount(prevElement.children as SimpElement, renderRuntime);
          prevElement.children = undefined;
        }
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
