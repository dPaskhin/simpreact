import { useRef, useRerender } from '@simpreact/hooks';

export function useState<T>(initialValue: T): [value: T, setState: (value: T | ((prev: T) => T)) => void] {
  const ref = useRef(initialValue);
  const rerender = useRerender();
  const cbRef = useRef<(value: T | ((prev: T) => T)) => void>(value => {
    if (typeof value === 'function') {
      value = (value as (prev: T) => T)(ref.current);
    }
    ref.current = value;
    rerender();
  });

  return [ref.current, cbRef.current];
}
