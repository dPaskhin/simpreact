import { applyRef, cleanupRef } from '../main/ref';
import type { SimpElement } from '../main';

describe('ref', () => {
  describe('cleanupRef', () => {
    it('does nothing if something is omitted', () => {
      expect(() => cleanupRef(null)).not.toThrow();
      expect(() => cleanupRef(undefined)).not.toThrow();
      expect(() => cleanupRef({ _store: null } as SimpElement)).not.toThrow();
      expect(() => cleanupRef({ _store: { refCleanup: null } } as SimpElement)).not.toThrow();
    });

    it('calls refCleanup if it exists and is a function', () => {
      const refCleanupMock = jest.fn();
      const element = { _store: { refCleanup: refCleanupMock } } as SimpElement;

      cleanupRef(element);

      expect(refCleanupMock).toHaveBeenCalled();
    });
  });

  describe('applyRef', () => {
    it('handles non-function ref by setting ref.current to element._reference', () => {
      const ref = { current: null };
      const element = { props: { ref }, _reference: 'test-reference' } as SimpElement;

      applyRef(element);

      expect(ref.current).toBe('test-reference');
    });

    it('calls function ref with element._reference', () => {
      const refMock = jest.fn();
      const element = { props: { ref: refMock }, _reference: 'test-reference' } as SimpElement;

      applyRef(element);

      expect(refMock).toHaveBeenCalledWith('test-reference');
    });

    it('stores cleanup function in element._store.refCleanup if provided', () => {
      const cleanupMock = jest.fn();
      const refMock = jest.fn(() => cleanupMock);
      const element = { props: { ref: refMock }, _reference: 'test-reference' } as SimpElement;

      applyRef(element);

      expect(refMock).toHaveBeenCalledWith('test-reference');
      expect((element._store as any).refCleanup).toBe(cleanupMock);
    });
  });
});
