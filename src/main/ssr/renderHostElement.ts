import { hasTextChild, type SimpElement, type SimpRenderRuntime } from '@simpreact/internal';
import type { Maybe } from '@simpreact/shared';
import { escapeHtml } from './escape.js';
import { renderChildren } from './renderToString.js';
import { serializeProps } from './serializeProps.js';
import { isVoidElement } from './voidElements.js';

const XHTML_NAMESPACE = 'http://www.w3.org/1999/xhtml';
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

export function getSsrNamespaces(
  element: SimpElement,
  currentNamespace: Maybe<string>
): { self: Maybe<string>; children: Maybe<string> } | null {
  if (element.type === 'svg') {
    return { self: SVG_NAMESPACE, children: SVG_NAMESPACE };
  }
  if (element.type === 'foreignObject') {
    return { self: SVG_NAMESPACE, children: null };
  }
  if (currentNamespace && currentNamespace !== XHTML_NAMESPACE) {
    return { self: currentNamespace, children: currentNamespace };
  }
  return null;
}

export function renderHostElement(
  element: SimpElement,
  renderRuntime: SimpRenderRuntime,
  context: unknown,
  hostNamespace: Maybe<string>
): string {
  const tag = element.type as string;
  const namespaces = getSsrNamespaces(element, hostNamespace);
  const selfNamespace = namespaces?.self ?? hostNamespace ?? null;

  let html = `<${tag}${serializeProps(element, selfNamespace)}`;

  if (element.className) {
    html += ` class="${escapeHtml(element.className)}"`;
  }

  html += '>';

  if (isVoidElement(tag)) {
    return html;
  }

  const dangerHtml = element.props?.dangerouslySetInnerHTML;

  if (dangerHtml) {
    if (element.children) {
      console.warn(
        'Avoid setting both children and props.dangerouslySetInnerHTML at the same time — this causes unpredictable behavior.'
      );
    }
    html += dangerHtml.__html ?? '';
  } else if (hasTextChild(element)) {
    html += escapeHtml(String(element.props.children));
  } else {
    html += renderChildren(element, renderRuntime, context, namespaces?.children ?? hostNamespace);
  }

  html += `</${tag}>`;
  return html;
}
