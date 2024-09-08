import { createElement, forEachElement, type SimpElement } from '../../../main/element';

describe('forEachElement', () => {
  it('does not call the callback when elements is nullish', () => {
    const cb = jest.fn();
    forEachElement(null, cb);
    forEachElement(undefined, cb);

    expect(cb).not.toHaveBeenCalled();
  });

  it('calls the callback once when elements is a single SimpElement', () => {
    const element = createElement('div');
    const cb = jest.fn();
    forEachElement(element, cb);

    expect(cb).toHaveBeenNthCalledWith(1, element, 0);
  });

  it('calls the callback for each element in the array', () => {
    const elements = [createElement('span'), createElement('div')];
    const cb = jest.fn();
    forEachElement(elements, cb);

    expect(cb).toHaveBeenCalledTimes(elements.length);
    elements.forEach((element, index) => {
      expect(cb).toHaveBeenCalledWith(element, index);
    });
  });

  it('does not call the callback when elements is an empty array', () => {
    const elements: SimpElement[] = [];
    const cb = jest.fn();
    forEachElement(elements, cb);

    expect(cb).not.toHaveBeenCalled();
  });

  it('calls the callback once when elements contains a single SimpElement in an array', () => {
    const elements = [createElement('div')];
    const cb = jest.fn();
    forEachElement(elements, cb);

    expect(cb).toHaveBeenNthCalledWith(1, elements[0], 0);
  });
});
