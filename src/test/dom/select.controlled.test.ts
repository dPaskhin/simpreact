import type { SimpElement, SimpRenderRuntime } from '@simpreact/internal';
import { createElement, SIMP_ELEMENT_CHILD_FLAG_LIST } from '@simpreact/internal';
import { emptyObject } from '@simpreact/shared';
import { describe, expect, it, vi } from 'vitest';
import {
  addControlledSelectEventHandlers,
  isEventNameIgnored,
  removeControlledSelectEventHandlers,
  syncControlledSelectProps,
} from '../../main/dom/props/controlled/select.js';
import { testHostAdapter } from '../test-host-adapter.js';

const renderRuntime: SimpRenderRuntime = {
  hostAdapter: testHostAdapter,
  renderer(type, element) {
    return type(element.props || emptyObject);
  },
};

const createSelect = (props: any = {}) => {
  const select = document.createElement('select');
  Object.assign(select, props);
  return select;
};
const createOption = (value: string, selected = false) => {
  const option = document.createElement('option');
  option.value = value;
  option.selected = selected;
  return option;
};

describe('select controlled', () => {
  describe('isEventNameIgnored', () => {
    it('returns true for onChange', () => {
      expect(isEventNameIgnored('onChange')).toBe(true);
    });
    it('returns false for onInput', () => {
      expect(isEventNameIgnored('onInput')).toBe(false);
    });
  });

  describe('addControlledSelectEventHandlers/removeControlledSelectEventHandlers', () => {
    it('adds and removes change event', () => {
      const select = createSelect();
      const add = vi.spyOn(select, 'addEventListener');
      const remove = vi.spyOn(select, 'removeEventListener');
      addControlledSelectEventHandlers(select, renderRuntime);
      expect(add).toHaveBeenCalledWith('change', expect.any(Function));
      removeControlledSelectEventHandlers(select, renderRuntime);
      expect(remove).toHaveBeenCalledWith('change', expect.any(Function));
    });
  });

  describe('syncControlledSelectProps', () => {
    it('sets multiple property', () => {
      const select = createSelect();
      const props = { multiple: true };
      const element = createElement('select', props);
      element.reference = select;
      syncControlledSelectProps(element, props);
      expect(select.multiple).toBe(true);
    });
    it('sets selectedIndex to -1', () => {
      const select = createSelect();
      const props = { selectedIndex: -1 };
      const element = createElement('select', props);
      element.reference = select;
      syncControlledSelectProps(element, props);
      expect(select.selectedIndex).toBe(-1);
    });
    it('sets value from option at selectedIndex', () => {
      const select = createSelect();
      select.append(createOption('a'), createOption('b'));
      const props = { selectedIndex: 1 };
      const element = createElement(
        'select',
        props,
        createElement('option', { value: 'a' }),
        createElement('option', { value: 'b' })
      );
      element.reference = select;
      (element.children as SimpElement[])[0]!.reference = select.options[0];
      (element.children as SimpElement[])[1]!.reference = select.options[1];

      syncControlledSelectProps(element, props);

      expect(select.options[1]!.selected).toBe(true);
    });
    it('uses defaultValue on mount if value is not set', () => {
      const select = createSelect();
      const opt1 = createOption('foo');
      select.append(opt1);
      const props = { defaultValue: 'foo' };
      const element = createElement('select', props);
      element.reference = select;
      syncControlledSelectProps(element, props, true);
      expect(opt1.selected).toBe(true);
    });
    it('selects correct option for single value', () => {
      const select = createSelect();
      const opt1 = createOption('a');
      const opt2 = createOption('b');
      select.append(opt1, opt2);
      const props = { value: 'b' };
      const element = createElement('select', props);
      element.reference = select;
      // Simulate SimpElement children
      element.children = [createElement('option', { value: 'a' }), createElement('option', { value: 'b' })];
      element.childFlag = SIMP_ELEMENT_CHILD_FLAG_LIST;
      (element.children as any[])[0].reference = opt1;
      (element.children as any[])[1].reference = opt2;

      syncControlledSelectProps(element, props);

      expect(opt1.selected).toBe(false);
      expect(opt2.selected).toBe(true);
    });
    it('selects correct options for multiple values', () => {
      const select = createSelect({ multiple: true });
      const opt1 = createOption('a');
      const opt2 = createOption('b');
      select.append(opt1, opt2);
      const props = { value: ['a', 'b'], multiple: true };
      const element = createElement('select', props);
      element.reference = select;
      element.children = [createElement('option', { value: 'a' }), createElement('option', { value: 'b' })];
      element.childFlag = SIMP_ELEMENT_CHILD_FLAG_LIST;
      (element.children as any[])[0].reference = opt1;
      (element.children as any[])[1].reference = opt2;

      syncControlledSelectProps(element, props);

      expect(opt1.selected).toBe(true);
      expect(opt2.selected).toBe(true);
    });
    it('respects props.selected if value is not matched', () => {
      const select = createSelect();
      const opt1 = createOption('a');
      const opt2 = createOption('b');
      select.append(opt1, opt2);
      const props = { value: 'c' };
      const element = createElement('select', props);
      element.reference = select;
      element.children = [
        createElement('option', { value: 'a', selected: true }),
        createElement('option', { value: 'b' }),
      ];
      if (element.children) {
        (element.children as any[])[0].reference = opt1;
        (element.children as any[])[1].reference = opt2;
      }
      syncControlledSelectProps(element, props);
      expect(opt1.selected).toBe(true);
      expect(opt2.selected).toBe(false);
    });
  });
});
