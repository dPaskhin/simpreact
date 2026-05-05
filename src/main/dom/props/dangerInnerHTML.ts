import type { SimpElement } from '@simpreact/internal';
import type { Maybe } from '@simpreact/shared';

type DangerInnerHTMLValue = { __html: string };

export function patchDangerInnerHTML(
  prevValue: Maybe<DangerInnerHTMLValue>,
  nextValue: Maybe<DangerInnerHTMLValue>,
  nextElement: SimpElement,
  dom: Element
): void {
  const prevHTML = prevValue?.__html;
  const nextHTML = nextValue?.__html;

  if (nextElement.children) {
    console.warn(
      'Avoid setting both children and props.dangerouslySetInnerHTML at the same time — this causes unpredictable behavior.'
    );
  }

  if (prevHTML === nextHTML) {
    return;
  }

  const nextInnerHTML = nextHTML ?? '';

  if (!isSameInnerHTML(dom, nextInnerHTML)) {
    dom.innerHTML = nextInnerHTML;
  }
}

function isSameInnerHTML(dom: Element, innerHTML: string): boolean {
  const temp = document.createElement('i');

  temp.innerHTML = innerHTML;
  return temp.innerHTML === dom.innerHTML;
}
