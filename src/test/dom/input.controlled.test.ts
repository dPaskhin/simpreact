import { createElement, type SimpRenderRuntime } from '@simpreact/internal';
import { emptyObject } from '@simpreact/shared';
import { describe, expect, it, vi } from 'vitest';
import {
  addControlledInputEventHandlers,
  isCheckedType,
  isEventNameIgnored,
  removeControlledInputEventHandlers,
  syncControlledInputProps,
} from '../../main/dom/props/controlled/input.js';
import { testHostAdapter } from '../test-host-adapter.js';

const createInput = (type = 'text') => {
  const input = document.createElement('input');
  input.type = type;
  return input;
};

const renderRuntime: SimpRenderRuntime = {
  hostAdapter: testHostAdapter,
  renderer(type, element) {
    return type(element.props || emptyObject);
  },
};

describe('input controlled', () => {
  describe('isCheckedType', () => {
    it('returns true for checkbox', () => {
      expect(isCheckedType('checkbox')).toBe(true);
    });
    it('returns true for radio', () => {
      expect(isCheckedType('radio')).toBe(true);
    });
    it('returns false for text', () => {
      expect(isCheckedType('text')).toBe(false);
    });
  });

  describe('isEventNameIgnored', () => {
    it('ignores onChange for checkbox', () => {
      expect(isEventNameIgnored({ type: 'checkbox' }, 'onChange')).toBe(true);
      expect(isEventNameIgnored({ type: 'checkbox' }, 'onInput')).toBe(false);
    });
    it('ignores onChange for radio', () => {
      expect(isEventNameIgnored({ type: 'checkbox' }, 'onChange')).toBe(true);
      expect(isEventNameIgnored({ type: 'checkbox' }, 'onInput')).toBe(false);
    });
    it('ignores onInput for text', () => {
      expect(isEventNameIgnored({ type: 'text' }, 'onInput')).toBe(true);
      expect(isEventNameIgnored({ type: 'text' }, 'onChange')).toBe(false);
    });
  });

  describe('addControlledInputEventHandlers/removeControlledInputEventHandlers', () => {
    it('adds and removes change for checkbox', () => {
      const input = createInput('checkbox');
      const add = vi.spyOn(input, 'addEventListener');
      const remove = vi.spyOn(input, 'removeEventListener');
      addControlledInputEventHandlers(input, renderRuntime);
      expect(add).toHaveBeenCalledWith('change', expect.any(Function));
      removeControlledInputEventHandlers(input, renderRuntime);
      expect(remove).toHaveBeenCalledWith('change', expect.any(Function));
    });
    it('adds and removes input for text', () => {
      const input = createInput('text');
      const add = vi.spyOn(input, 'addEventListener');
      const remove = vi.spyOn(input, 'removeEventListener');
      addControlledInputEventHandlers(input, renderRuntime);
      expect(add).toHaveBeenCalledWith('input', expect.any(Function));
      removeControlledInputEventHandlers(input, renderRuntime);
      expect(remove).toHaveBeenCalledWith('input', expect.any(Function));
    });
  });

  describe('syncControlledInputProps', () => {
    it('sets type, value, checked, multiple for checkbox', () => {
      const input = createInput('checkbox');
      const props = {
        type: 'checkbox',
        value: 'on',
        checked: true,
        multiple: true,
      };
      const element = createElement('input', props);
      element.reference = input;

      syncControlledInputProps(element, props);

      expect(input.type).toBe('checkbox');
      expect(input.checked).toBe(true);
      expect(input.multiple).toBe(true);
    });
    it('sets value and defaultValue for text', () => {
      const input = createInput('text');
      const props = { type: 'text', value: 'bar', defaultValue: 'baz' };
      const element = createElement('input', props);
      element.reference = input;

      syncControlledInputProps(element, props);

      expect(input.value).toBe('bar');
      expect(input.defaultValue).toBe('bar');
    });
    it('sets defaultValue if value is not present', () => {
      const input = createInput('text');
      const props = { type: 'text', defaultValue: 'baz' };
      const element = createElement('input', props);
      element.reference = input;

      syncControlledInputProps(element, props);

      expect(input.defaultValue).toBe('baz');
    });
    it('does not set checked if checked is not present', () => {
      const input = createInput('checkbox');
      const props = { type: 'checkbox' };
      const element = createElement('input', props);
      element.reference = input;
      syncControlledInputProps(element, props);
      expect(input.checked).toBe(false);
    });
    it('updates type if different', () => {
      const input = createInput('text');
      const props = { type: 'password' };
      const element = createElement('input', props);
      element.reference = input;
      syncControlledInputProps(element, props);
      expect(input.type).toBe('password');
    });
  });
});
