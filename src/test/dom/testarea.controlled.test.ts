import { describe, expect, it, vi } from 'vitest';
import {
  addControlledTextareaEventHandlers,
  isEventNameIgnored,
  removeControlledTextareaEventHandlers,
  syncControlledTextareaProps,
} from '../../main/dom/props/controlled/textarea.js';

describe('textarea controlled', () => {
  describe('isEventNameIgnored', () => {
    it('should return true for "onChange" and "onInput"', () => {
      expect(isEventNameIgnored('onChange')).toBe(true);
      expect(isEventNameIgnored('onInput')).toBe(true);
    });

    it('should return false for other event names', () => {
      expect(isEventNameIgnored('onClick')).toBe(false);
      expect(isEventNameIgnored('onFocus')).toBe(false);
    });
  });

  describe('addControlledTextareaEventHandlers / removeControlledTextareaEventHandlers', () => {
    it('should add and remove event listeners', () => {
      const textarea = document.createElement('textarea');
      const addSpy = vi.spyOn(textarea, 'addEventListener');
      const removeSpy = vi.spyOn(textarea, 'removeEventListener');

      addControlledTextareaEventHandlers(textarea);
      expect(addSpy).toHaveBeenCalledWith('input', expect.any(Function));
      expect(addSpy).toHaveBeenCalledWith('change', expect.any(Function));

      removeControlledTextareaEventHandlers(textarea);
      expect(removeSpy).toHaveBeenCalledWith('input', expect.any(Function));
      expect(removeSpy).toHaveBeenCalledWith('change', expect.any(Function));
    });
  });

  describe('syncControlledTextareaProps', () => {
    it('should set value and defaultValue when props.value is defined', () => {
      const textarea = document.createElement('textarea');
      textarea.value = 'old';
      const element = {
        reference: textarea,
      };

      syncControlledTextareaProps(element as any, { value: 'new' });

      expect(textarea.value).toBe('new');
      expect(textarea.defaultValue).toBe('new');
    });

    it('should set defaultValue if mounting and defaultValue provided', () => {
      const textarea = document.createElement('textarea');
      textarea.value = 'old';
      const element = {
        reference: textarea,
      };

      syncControlledTextareaProps(element as any, { value: null, defaultValue: 'default' }, true);

      expect(textarea.value).toBe('default');
      expect(textarea.defaultValue).toBe('default');
    });

    it('should not change anything if value and defaultValue are null', () => {
      const textarea = document.createElement('textarea');
      textarea.value = 'original';
      const element = {
        reference: textarea,
      };

      syncControlledTextareaProps(element as any, { value: null }, false);

      expect(textarea.value).toBe('original');
      expect(textarea.defaultValue).toBe('');
    });
  });
});
