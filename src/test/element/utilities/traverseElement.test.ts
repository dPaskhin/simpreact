import { createElement, type SimpElement, traverseElement } from '../../../main/element';
import { actualizeElementTree } from '../../diff/diff.test';

describe('traverseElement', () => {
  it('traverses deeply nested elements correctly', () => {
    // DFS traversing of the numbered tree https://en.wikipedia.org/wiki/Depth-first_search
    //
    //     root
    //    /  |  \
    //  f0   f1   f2
    //  / \   \   \
    // s0  s1  s2   s3
    //
    // The output is root,f0,s0,s1,f1,s2,f2,s3
    const tree = actualizeElementTree(
      createElement(
        'root',
        null,
        createElement('f0', null, createElement('s0'), createElement('s1')),
        createElement('f1', null, createElement('s2')),
        createElement('f2', null, createElement('s3'))
      )
    );

    const cb = jest.fn();

    traverseElement(tree, cb);

    expect(cb).toHaveBeenCalledTimes(8);

    expect(cb).toHaveBeenNthCalledWith(1, expect.objectContaining({ type: 's0' }));
    expect(cb).toHaveBeenNthCalledWith(2, expect.objectContaining({ type: 's1' }));
    expect(cb).toHaveBeenNthCalledWith(3, expect.objectContaining({ type: 'f0' }));
    expect(cb).toHaveBeenNthCalledWith(4, expect.objectContaining({ type: 's2' }));
    expect(cb).toHaveBeenNthCalledWith(5, expect.objectContaining({ type: 'f1' }));
    expect(cb).toHaveBeenNthCalledWith(6, expect.objectContaining({ type: 's3' }));
    expect(cb).toHaveBeenNthCalledWith(7, expect.objectContaining({ type: 'f2' }));
    expect(cb).toHaveBeenNthCalledWith(8, expect.objectContaining({ type: 'root' }));
  });

  it('traverses a single element correctly', () => {
    const element = createElement('div');

    const callback = jest.fn();

    traverseElement(element, callback);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(element);
  });

  it('traverses nested elements correctly', () => {
    const elementTree = actualizeElementTree(createElement('div', null, createElement('span'), createElement('p')));

    const callback = jest.fn();

    traverseElement(elementTree, callback);

    expect(callback).toHaveBeenCalledTimes(3);
    expect(callback).toHaveBeenNthCalledWith(1, expect.objectContaining({ type: 'span' }));
    expect(callback).toHaveBeenNthCalledWith(2, expect.objectContaining({ type: 'p' }));
    expect(callback).toHaveBeenNthCalledWith(3, expect.objectContaining({ type: 'div' }));
  });

  it('does not call the callback if elements are null or undefined', () => {
    const callback = jest.fn();

    traverseElement(null, callback);
    traverseElement(undefined, callback);

    expect(callback).not.toHaveBeenCalled();
  });

  it('traverses multiple root elements correctly', () => {
    const elementTree = [
      actualizeElementTree(createElement('div')),
      actualizeElementTree(createElement('span')),
    ] as SimpElement[];
    const callback = jest.fn();

    traverseElement(elementTree, callback);

    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenNthCalledWith(1, expect.objectContaining({ type: 'div' }));
    expect(callback).toHaveBeenNthCalledWith(2, expect.objectContaining({ type: 'span' }));
  });

  it('traverses a large element tree structure efficiently', () => {
    const depth = 3;
    const breadth = 3;

    const generateLargeTree = (depth: number, breadth: number): SimpElement => {
      if (depth === 0) {
        return createElement('leaf');
      }

      return createElement(
        'node',
        null,
        ...Array.from({ length: breadth }, () => generateLargeTree(depth - 1, breadth))
      );
    };

    const largeTree = actualizeElementTree(generateLargeTree(depth, breadth));
    const callback = jest.fn();

    traverseElement(largeTree, callback);

    expect(callback).toHaveBeenCalledTimes((Math.pow(breadth, depth + 1) - 1) / (breadth - 1));
  });
});
