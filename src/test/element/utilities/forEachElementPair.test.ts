import { createElement, forEachElementPair, type SimpElement } from '../../../main/element';

describe('forEachElementPair', () => {
  it('does not call the callback when both elements1 and elements2 are null', () => {
    const cb = jest.fn();
    forEachElementPair(null, null, cb);

    expect(cb).not.toHaveBeenCalled();
  });

  it('calls the callback with undefined for elements1 and each element of elements2 when elements1 is null', () => {
    const elements2 = [createElement('div'), createElement('span')] as SimpElement[];
    const cb = jest.fn();
    forEachElementPair(null, elements2, cb);

    expect(cb).toHaveBeenNthCalledWith(1, undefined, elements2[0], 0);
    expect(cb).toHaveBeenNthCalledWith(2, undefined, elements2[1], 1);
  });

  it('calls the callback with each element of elements1 and undefined for elements2 when elements2 is null', () => {
    const elements1 = [createElement('div'), createElement('span')];
    const cb = jest.fn();
    forEachElementPair(elements1, null, cb);

    expect(cb).toHaveBeenNthCalledWith(1, elements1[0], undefined, 0);
    expect(cb).toHaveBeenNthCalledWith(2, elements1[1], undefined, 1);
  });

  it('calls the callback with each corresponding pair of elements when both elements1 and elements2 are arrays of equal length', () => {
    const elements1 = [createElement('div'), createElement('span')];
    const elements2 = [createElement('s'), createElement('b')];
    const cb = jest.fn();
    forEachElementPair(elements1, elements2, cb);

    expect(cb).toHaveBeenNthCalledWith(1, elements1[0], elements2[0], 0);
    expect(cb).toHaveBeenNthCalledWith(2, elements1[1], elements2[1], 1);
  });

  it('calls the callback with each corresponding pair of elements when elements1 and elements2 have different lengths', () => {
    const elements1 = [createElement('span')];
    const elements2 = [createElement('div'), createElement('p')];
    const cb = jest.fn();
    forEachElementPair(elements1, elements2, cb);

    expect(cb).toHaveBeenNthCalledWith(1, elements1[0], elements2[0], 0);
    expect(cb).toHaveBeenNthCalledWith(2, undefined, elements2[1], 1);
  });

  it('calls the callback correctly when elements1 is a single SimpElement and elements2 is an array', () => {
    const elements1 = createElement('span');
    const elements2 = [createElement('div'), createElement('p')];
    const cb = jest.fn();
    forEachElementPair(elements1, elements2, cb);

    expect(cb).toHaveBeenNthCalledWith(1, elements1, elements2[0], 0);
    expect(cb).toHaveBeenNthCalledWith(2, undefined, elements2[1], 1);
  });

  it('calls the callback correctly when elements2 is a single SimpElement and elements1 is an array', () => {
    const elements1 = [createElement('div'), createElement('p')];
    const elements2 = createElement('span');
    const cb = jest.fn();
    forEachElementPair(elements1, elements2, cb);

    expect(cb).toHaveBeenNthCalledWith(1, elements1[0], elements2, 0);
    expect(cb).toHaveBeenNthCalledWith(2, elements1[1], undefined, 1);
  });

  it('does not call the callback when both elements1 and elements2 are empty arrays', () => {
    const cb = jest.fn();
    forEachElementPair([], [], cb);

    expect(cb).not.toHaveBeenCalled();
  });
});
