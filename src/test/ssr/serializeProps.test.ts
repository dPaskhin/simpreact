import type { SimpElement } from '@simpreact/internal';
import { describe, expect, it } from 'vitest';
import { serializeProps } from '../../main/ssr/serializeProps.js';

function el(props: any): SimpElement {
  return { props } as SimpElement;
}

describe('serializeProps', () => {
  it('omits children/className/key/ref/dangerouslySetInnerHTML', () => {
    expect(
      serializeProps(
        el({ children: 'x', className: 'y', key: 'k', ref: {}, dangerouslySetInnerHTML: { __html: 'x' } }),
        null
      )
    ).toBe('');
  });

  it('never emits event handler props', () => {
    expect(serializeProps(el({ onClick: () => {}, onChange: () => {} }), null)).toBe('');
  });

  it.each(['disabled', 'hidden', 'autofocus', 'inert'])('renders shared boolean idl attr "%s" when truthy', name => {
    expect(serializeProps(el({ [name]: true }), null)).toBe(` ${name}`);
  });

  it.each(['disabled', 'hidden', 'autofocus', 'inert'])('omits shared boolean idl attr "%s" when falsy', name => {
    expect(serializeProps(el({ [name]: false }), null)).toBe('');
  });

  it('resolves autoFocus alias to the autofocus boolean attr', () => {
    expect(serializeProps(el({ autoFocus: true }), null)).toBe(' autofocus');
  });

  it.each(['checked', 'selected', 'multiple', 'readOnly', 'required', 'autoplay', 'controls', 'loop', 'muted', 'open'])(
    'renders extra boolean attr "%s" when truthy, omits when falsy',
    name => {
      expect(serializeProps(el({ [name]: true }), null)).toBe(` ${name}`);
      expect(serializeProps(el({ [name]: false }), null)).toBe('');
    }
  );

  it('renders value/defaultValue as a value attribute', () => {
    expect(serializeProps(el({ value: 'abc' }), null)).toBe(' value="abc"');
    expect(serializeProps(el({ defaultValue: 'abc' }), null)).toBe(' value="abc"');
  });

  it('skips selectedIndex (no static HTML equivalent)', () => {
    expect(serializeProps(el({ selectedIndex: 2 }), null)).toBe('');
  });

  it('serializes a style object using kebab-case property names', () => {
    expect(serializeProps(el({ style: { color: 'red', fontSize: '12px' } }), null)).toBe(
      ' style="color: red;font-size: 12px;"'
    );
  });

  it('serializes a style string passthrough', () => {
    expect(serializeProps(el({ style: 'color:red' }), null)).toBe(' style="color:red"');
  });

  it('omits null style keys', () => {
    expect(serializeProps(el({ style: { color: 'red', background: null } }), null)).toBe(' style="color: red;"');
  });

  it('renders htmlFor as the for attribute', () => {
    expect(serializeProps(el({ htmlFor: 'field' }), null)).toBe(' for="field"');
  });

  it('hyphenates SVG camelCase attribute names only under the SVG namespace', () => {
    expect(serializeProps(el({ fillOpacity: '0.5' }), 'http://www.w3.org/2000/svg')).toBe(' fill-opacity="0.5"');
    expect(serializeProps(el({ fillOpacity: '0.5' }), null)).toBe(' fillOpacity="0.5"');
  });

  it('renders xlink/xml namespaced SVG attributes as-is under the SVG namespace', () => {
    expect(serializeProps(el({ 'xlink:href': '#id' }), 'http://www.w3.org/2000/svg')).toBe(' xlink:href="#id"');
  });

  it('omits attributes with null/undefined values', () => {
    expect(serializeProps(el({ title: null, id: undefined }), null)).toBe('');
  });

  it('stringifies false for generic (non-boolean-category) attributes', () => {
    expect(serializeProps(el({ 'data-active': false }), null)).toBe(' data-active="false"');
  });

  it('passes through arbitrary data-*/aria-* attributes unescaped in name, escaped in value', () => {
    expect(serializeProps(el({ 'data-id': '<x>' }), null)).toBe(' data-id="&lt;x&gt;"');
  });
});
