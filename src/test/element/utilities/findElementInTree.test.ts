import { createElement, findElementInTree, SimpElement } from '../../../main/element';
import { actualizeElementTree } from '../../diff/diff.test';

describe('findElementInTree', () => {
  it('finds a matching elements in the tree using DFS algorithm', () => {
    // The count of invocations (parentheses) of the predicates is the same as the order of the element in the tree.
    // See the DFS algorithm (https://en.wikipedia.org/wiki/Depth-first_search)
    //
    //             root(1)
    //          /    |    \
    //        f0(2) f1(7) f2(8)
    //        /  \         |    \
    //     s0(3) s1(6)   s2(9)  s3(12)
    //    /    \           /    \
    //   t0(4) t1(5)    t2(10) t3(11)
    const tree = actualizeElementTree(
      createElement(
        'root',
        null,
        createElement(
          'f0',
          null,
          createElement('s0', null, createElement('t0'), createElement('t1')),
          createElement('s1')
        ),
        createElement('f1'),
        createElement(
          'f2',
          null,
          createElement('s2', null, createElement('t2'), createElement('t3')),
          createElement('s3')
        )
      )
    );

    const predicateRoot = jest.fn().mockImplementation((element: SimpElement) => element.type === 'root');
    const predicateF0 = jest.fn().mockImplementation((element: SimpElement) => element.type === 'f0');
    const predicateF1 = jest.fn().mockImplementation((element: SimpElement) => element.type === 'f1');
    const predicateF2 = jest.fn().mockImplementation((element: SimpElement) => element.type === 'f2');
    const predicateS0 = jest.fn().mockImplementation((element: SimpElement) => element.type === 's0');
    const predicateS1 = jest.fn().mockImplementation((element: SimpElement) => element.type === 's1');
    const predicateS2 = jest.fn().mockImplementation((element: SimpElement) => element.type === 's2');
    const predicateS3 = jest.fn().mockImplementation((element: SimpElement) => element.type === 's3');
    const predicateT0 = jest.fn().mockImplementation((element: SimpElement) => element.type === 't0');
    const predicateT1 = jest.fn().mockImplementation((element: SimpElement) => element.type === 't1');
    const predicateT2 = jest.fn().mockImplementation((element: SimpElement) => element.type === 't2');
    const predicateT3 = jest.fn().mockImplementation((element: SimpElement) => element.type === 't3');

    expect(findElementInTree(tree, predicateRoot)?.type).toBe('root');
    expect(findElementInTree(tree, predicateF0)?.type).toBe('f0');
    expect(findElementInTree(tree, predicateF1)?.type).toBe('f1');
    expect(findElementInTree(tree, predicateF2)?.type).toBe('f2');
    expect(findElementInTree(tree, predicateS0)?.type).toBe('s0');
    expect(findElementInTree(tree, predicateS1)?.type).toBe('s1');
    expect(findElementInTree(tree, predicateS2)?.type).toBe('s2');
    expect(findElementInTree(tree, predicateS3)?.type).toBe('s3');
    expect(findElementInTree(tree, predicateT0)?.type).toBe('t0');
    expect(findElementInTree(tree, predicateT1)?.type).toBe('t1');
    expect(findElementInTree(tree, predicateT2)?.type).toBe('t2');
    expect(findElementInTree(tree, predicateT3)?.type).toBe('t3');

    expect(predicateRoot).toHaveBeenCalledTimes(1);
    expect(predicateF0).toHaveBeenCalledTimes(2);
    expect(predicateS0).toHaveBeenCalledTimes(3);
    expect(predicateT0).toHaveBeenCalledTimes(4);
    expect(predicateT1).toHaveBeenCalledTimes(5);
    expect(predicateS1).toHaveBeenCalledTimes(6);
    expect(predicateF1).toHaveBeenCalledTimes(7);
    expect(predicateF2).toHaveBeenCalledTimes(8);
    expect(predicateS2).toHaveBeenCalledTimes(9);
    expect(predicateT2).toHaveBeenCalledTimes(10);
    expect(predicateT3).toHaveBeenCalledTimes(11);
    expect(predicateS3).toHaveBeenCalledTimes(12);
  });

  it('finds a matching element in the tree', () => {
    // The used tree:
    //
    // Square bracket - the element which we're looking for (prop - findMe)
    // Parentheses    - the element which we have to ignore because it's not the deepest element in the tree
    //                  though, the element has the prop - findMe as well
    //
    //
    //         root
    //         / | \
    //       f0 (f1) f2
    //     / \      | \
    //    s0 [s1]     s2 s3
    //   / \        / \
    //  t0  t1     t2 t3
    const tree = actualizeElementTree(
      createElement(
        'root',
        null,
        createElement(
          'f0',
          null,
          createElement('s0', null, createElement('t0'), createElement('t1')),
          createElement('s1', { findMe: true })
        ),
        createElement('f1', { findMe: true }),
        createElement(
          'f2',
          null,
          createElement('s2', null, createElement('t2'), createElement('t3')),
          createElement('s3')
        )
      )
    );

    expect(findElementInTree(tree, element => element.props?.findMe)?.type).toBe('s1');
    expect(findElementInTree(tree, element => element.props?.id)).toBeUndefined();
  });
});
