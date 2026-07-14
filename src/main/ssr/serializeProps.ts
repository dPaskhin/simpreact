import {
  camelToKebab,
  htmlAttrAlias,
  sharedBooleanIdlAttrs,
  svgAttrsNamespaces,
  svgCamelToHyphen,
} from '@simpreact/dom';
import type { SimpElement } from '@simpreact/internal';
import { escapeHtml } from './escape.js';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

// Assigned as an IDL property in real-DOM rendering (props.ts) — same presence-only rule as sharedBooleanIdlAttrs.
const extraBooleanAttrs: ReadonlySet<string> = new Set([
  'allowfullscreen',
  'autoplay',
  'controls',
  'default',
  'loop',
  'muted',
  'novalidate',
  'open',
  'reversed',
  'selected',
  'multiple',
  'checked',
  'defaultChecked',
  'indeterminate',
  'readOnly',
  'required',
  'capture',
]);

function isPropNameEventName(name: string): boolean {
  return name.charCodeAt(0) === 111 && name.charCodeAt(1) === 110;
}

const skippedPropNames: ReadonlySet<string> = new Set([
  'children',
  'className',
  'class',
  'key',
  'ref',
  'dangerouslySetInnerHTML',
]);

export function serializeProps(element: SimpElement, namespace: string | null): string {
  const props = element.props;
  if (!props) {
    return '';
  }

  let result = '';

  for (const rawName in props) {
    if (skippedPropNames.has(rawName)) {
      continue;
    }

    const name = htmlAttrAlias[rawName] ?? rawName;
    const value = props[rawName];

    if (isPropNameEventName(name)) {
      continue;
    }

    if (sharedBooleanIdlAttrs.has(name) || extraBooleanAttrs.has(name)) {
      if (value) {
        result += ` ${name}`;
      }
      continue;
    }

    if (value == null) {
      continue;
    }

    if (name === 'value' || name === 'defaultValue') {
      result += ` value="${escapeHtml(String(value))}"`;
      continue;
    }

    // No HTML attribute maps to <select>.selectedIndex; use the <option>'s `selected` attribute instead.
    if (name === 'selectedIndex') {
      continue;
    }

    if (name === 'style') {
      const style = serializeStyle(value);
      if (style) {
        result += ` style="${escapeHtml(style)}"`;
      }
      continue;
    }

    if (name === 'htmlFor') {
      result += ` for="${escapeHtml(String(value))}"`;
      continue;
    }

    if (namespace === SVG_NAMESPACE) {
      if (svgAttrsNamespaces[name]) {
        result += ` ${name}="${escapeHtml(String(value))}"`;
        continue;
      }
      const hyphenated = svgCamelToHyphen[name];
      if (hyphenated) {
        result += ` ${hyphenated}="${escapeHtml(String(value))}"`;
        continue;
      }
    }

    result += ` ${name}="${escapeHtml(String(value))}"`;
  }

  return result;
}

function serializeStyle(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  let result = '';
  for (const key in value as Record<string, unknown>) {
    const propValue = (value as Record<string, unknown>)[key];
    if (propValue == null) {
      continue;
    }
    result += `${camelToKebab(key)}: ${propValue};`;
  }
  return result;
}
