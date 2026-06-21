import { createElement } from '@simpreact/internal';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { patchDangerInnerHTML } from '../../../main/dom/props/dangerInnerHTML.js';

describe('patchDangerInnerHTML', () => {
  let dom: HTMLDivElement;

  beforeEach(() => {
    dom = document.createElement('div');
  });

  it('sets innerHTML when transitioning from null to a value', () => {
    patchDangerInnerHTML(null, { __html: '<b>hello</b>' }, createElement('div'), dom);
    expect(dom.innerHTML).toBe('<b>hello</b>');
  });

  it('updates innerHTML when the value changes', () => {
    dom.innerHTML = '<b>old</b>';
    patchDangerInnerHTML({ __html: '<b>old</b>' }, { __html: '<i>new</i>' }, createElement('div'), dom);
    expect(dom.innerHTML).toBe('<i>new</i>');
  });

  it('clears innerHTML when next value is null', () => {
    dom.innerHTML = '<b>old</b>';
    patchDangerInnerHTML({ __html: '<b>old</b>' }, null, createElement('div'), dom);
    expect(dom.innerHTML).toBe('');
  });

  it('clears innerHTML when next value is undefined', () => {
    dom.innerHTML = '<b>old</b>';
    patchDangerInnerHTML({ __html: '<b>old</b>' }, undefined, createElement('div'), dom);
    expect(dom.innerHTML).toBe('');
  });

  it('is a no-op when prevHTML and nextHTML are identical strings', () => {
    dom.innerHTML = '<b>hello</b>';
    const spy = vi.spyOn(dom, 'innerHTML', 'set');
    patchDangerInnerHTML({ __html: '<b>hello</b>' }, { __html: '<b>hello</b>' }, createElement('div'), dom);
    expect(spy).not.toHaveBeenCalled();
  });

  it('skips DOM write when parsed content is already identical', () => {
    dom.innerHTML = '<b>hello</b>';
    // prevHTML (undefined) !== nextHTML so the early-return doesn't apply,
    // but isSameInnerHTML returns true — DOM must remain unchanged.
    patchDangerInnerHTML(null, { __html: '<b>hello</b>' }, createElement('div'), dom);
    expect(dom.firstChild).not.toBeNull();
    expect(dom.innerHTML).toBe('<b>hello</b>');
  });

  it('emits a console.warn when element has SimpElement children alongside dangerouslySetInnerHTML', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const el = createElement('div', null, createElement('span'));
    // createElement stores SimpElement children in el.children, making it truthy
    patchDangerInnerHTML(null, { __html: '<b>hello</b>' }, el, dom);
    expect(warnSpy).toHaveBeenCalledOnce();
    expect(warnSpy.mock.calls[0]![0]).toMatch(/dangerouslySetInnerHTML/);
  });

  it('does not warn when element has no children', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    patchDangerInnerHTML(null, { __html: '<b>hello</b>' }, createElement('div'), dom);
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
