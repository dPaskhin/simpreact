import { createElement, Fragment, lifecycleManager } from '../../main';
import { actualizeElementTree } from './diff.test';
import { diff, EFFECT_TAG } from '../../main/diff';

// It should be fixed when keys are introduced
describe('custom Cases diffing', () => {
  it('handles the children ', () => {
    const prev = actualizeElementTree(
      createElement(Fragment, null, [
        createElement(
          'root',
          null,
          createElement('text', null, '1'),
          createElement('button', null, 'Done'),
          createElement('button', null, 'Delete')
        ),
        createElement('div', null, createElement('text', null, '2'), createElement('button', null, 'To do')),
      ])
    );
    // prettier-ignore
    const next = actualizeElementTree(
      createElement(Fragment, null, [
        createElement('root', null,
          createElement('text', null, '2'),
          createElement('button', null, 'To do'),
        ),
      ]),
    );

    const res = diff(prev, next, lifecycleManager, null);

    expect(res.tasks[0]).toEqual(
      expect.objectContaining({
        effectTag: EFFECT_TAG.UPDATE,
        nextElement: expect.objectContaining({ type: 'root' }),
        prevElement: expect.objectContaining({ type: 'root' }),
      })
    );
    expect(res.tasks[1]).toEqual(
      expect.objectContaining({
        effectTag: EFFECT_TAG.UPDATE,
        prevElement: expect.objectContaining({
          type: 'text',
          props: expect.objectContaining({ children: '1' }),
        }),
        nextElement: expect.objectContaining({
          type: 'text',
          props: expect.objectContaining({ children: '2' }),
        }),
      })
    );
    expect(res.tasks[2]).toEqual(
      expect.objectContaining({
        effectTag: EFFECT_TAG.UPDATE,
        prevElement: expect.objectContaining({
          type: 'button',
          props: expect.objectContaining({ children: 'Done' }),
        }),
        nextElement: expect.objectContaining({
          type: 'button',
          props: expect.objectContaining({ children: 'To do' }),
        }),
      })
    );
    expect(res.tasks[3]).toEqual(
      expect.objectContaining({
        effectTag: EFFECT_TAG.REMOVE,
        prevElement: expect.objectContaining({
          type: 'button',
          props: expect.objectContaining({ children: 'Delete' }),
        }),
        nextElement: null,
      })
    );
    expect(res.tasks[4]).toEqual(
      expect.objectContaining({
        effectTag: EFFECT_TAG.REMOVE,
        prevElement: expect.objectContaining({
          type: 'div',
        }),
        nextElement: null,
      })
    );

    // expect(res).toEqual([
    //   {
    //     tasks: [
    //       expect.objectContaining({
    //         effectTag: EFFECT_TAG.UPDATE,
    //         prevElement: expect.objectContaining({ type: 'div' }),
    //         nextElement: expect.objectContaining({ type: 'div' }),
    //       }),
    //       expect.objectContaining({
    //         effectTag: EFFECT_TAG.UPDATE,
    //         prevElement: expect.objectContaining({
    //           type: TEXT_TYPE,
    //           props: expect.objectContaining({ children: '1' }),
    //         }),
    //         nextElement: expect.objectContaining({
    //           type: TEXT_TYPE,
    //           props: expect.objectContaining({ children: '2' }),
    //         }),

    //       expect.objectContaining({
    //         effectTag: EFFECT_TAG.UPDATE,
    //         prevElement: expect.objectContaining({
    //           type: 'button',
    //           props: expect.objectContaining({ children: 'Done' }),
    //         }),
    //         nextElement: expect.objectContaining({
    //           type: 'button',
    //           props: expect.objectContaining({ children: 'To do' }),
    //         }),
    //       }),
    //       expect.objectContaining({
    //         effectTag: EFFECT_TAG.REMOVE,
    //         prevElement: expect.objectContaining({
    //           type: 'button',
    //           props: expect.objectContaining({ children: 'Delete' }),
    //         }),
    //         nextElement: null,
    //       }),
    //       expect.objectContaining({
    //         effectTag: EFFECT_TAG.REMOVE,
    //         prevElement: expect.objectContaining({
    //           type: 'div',
    //         }),
    //         nextElement: null,
    //       }),
    //     ],
    //     renderedElements: [],
    //     deletedElements: [],
    //   },
    // ]);
  });
});
