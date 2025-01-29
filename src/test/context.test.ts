import { createContext, createElement } from '../main';
import { getContextValue, isConsumerElement, isProviderElement } from '../main/context';

describe('context', () => {
  describe('createContext', () => {
    it('should create a context with the provided default value', () => {
      const defaultValue = 'default';
      const context = createContext(defaultValue);

      expect(context.defaultValue).toBe(defaultValue);
      expect(context.Provider).toBeDefined();
      expect(context.Consumer).toBeDefined();
    });

    it('Provider and Consumer should share the same context object', () => {
      const context = createContext('shared-context');
      expect((context.Provider as any)._context).toBe((context.Consumer as any)._context);
    });
  });

  describe('getContextValue', () => {
    it('should return the value from globalContext if it exists', () => {
      const globalContext = new Map();
      const context = createContext('default');
      const providerElement = createElement(context.Provider, { value: 'provided-value' });
      globalContext.set(context.Provider, providerElement);

      const value = getContextValue(globalContext, context);
      expect(value).toBe('provided-value');
    });

    it('should return the default value if globalContext does not have the context', () => {
      const context = createContext('default-value');
      const value = getContextValue(undefined, context);
      expect(value).toBe('default-value');
    });
  });

  describe('isProviderElement', () => {
    it('should return true for a Provider element', () => {
      const context = createContext('test');
      const providerElement = createElement(context.Provider);

      expect(isProviderElement(providerElement)).toBe(true);
    });

    it('should return false for a non-Provider element', () => {
      const nonProviderElement = createElement(() => null, {});
      expect(isProviderElement(nonProviderElement)).toBe(false);
    });
  });

  describe('isConsumerElement', () => {
    it('should return true for a Consumer element', () => {
      const context = createContext('test');
      const consumerElement = createElement(context.Consumer);

      expect(isConsumerElement(consumerElement)).toBe(true);
    });

    it('should return false for a non-Consumer element', () => {
      const nonConsumerElement = createElement(() => null, {});
      expect(isConsumerElement(nonConsumerElement)).toBe(false);
    });
  });
});
