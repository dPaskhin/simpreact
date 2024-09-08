import { elementsToArray, type SimpElement } from '../../../main/element';

describe('elementsToArray', () => {
  it('returns an empty array when elements is null', () => {
    const result = elementsToArray(null);
    expect(result).toStrictEqual([]);
  });

  it('returns an empty array when elements is undefined', () => {
    const result = elementsToArray(undefined);
    expect(result).toStrictEqual([]);
  });

  it('wraps a single SimpElement in an array', () => {
    const element = {} as SimpElement;
    const result = elementsToArray(element);
    expect(result).toStrictEqual([element]);
  });

  it('returns the array when elements is already an array of SimpElement', () => {
    const elements = [{}, {}] as SimpElement[];
    const result = elementsToArray(elements);
    expect(result).toStrictEqual(elements);
  });

  it('returns an empty array when elements is an empty array', () => {
    const elements: SimpElement[] = [];
    const result = elementsToArray(elements);
    expect(result).toStrictEqual([]);
  });

  it('returns the array as-is when it contains a single SimpElement', () => {
    const elements = [{}] as SimpElement[];
    const result = elementsToArray(elements);
    expect(result).toStrictEqual(elements);
  });

  it('handles complex SimpElement structures correctly', () => {
    const element = { _index: 1, _children: [{ _index: 2 }] } as SimpElement;
    const result = elementsToArray(element);
    expect(result).toStrictEqual([element]);

    const elements = [{ _index: 1, _children: [{ _index: 2 }] }, { _index: 3 }] as SimpElement[];
    const resultArray = elementsToArray(elements);
    expect(resultArray).toStrictEqual(elements);
  });
});
