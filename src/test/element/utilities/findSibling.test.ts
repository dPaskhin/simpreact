import { createElement, findRightSiblings, findSiblingReference } from '../../../main/element';
import { actualizeElementTree } from '../../diff/diff.test';

describe('siblings', () => {
  describe('findRightSiblings', () => {
    it('returns first layer right siblings', () => {
      const element = createElement('s0');

      // The used tree
      //
      // Square bracket - the element for which we're looking for siblings
      // Parentheses    - the siblings for the above element
      // Curly braces   - the element with reference
      //
      //         {root}
      //        /  |   \
      //     f0   (f1)   (f2)
      //    /      |
      //  [s0]     s1
      const tree = actualizeElementTree(
        createElement(
          'root',
          null,
          createElement('f0', null, element),
          createElement('f1', null, createElement('s1')),
          createElement('f2')
        )
      );

      tree!._reference = {};

      const result = findRightSiblings(element);

      expect(result).toStrictEqual([expect.objectContaining({ type: 'f1' }), expect.objectContaining({ type: 'f2' })]);
    });

    it("returns empty siblings list since the parent element with reference doesn't have another children", () => {
      const element = createElement('s1');
      const f1Element = createElement('f1', null, element);

      f1Element._reference = {};

      // The used tree
      //
      // Parentheses    - the sibling for the above element
      // Curly braces   - the element with reference
      //
      //          root
      //        /  |   \
      //     f0   {f1}  f2
      //    /      |
      //   s0     [s1]
      actualizeElementTree(
        createElement('root', null, createElement('f0', null, createElement('s0')), f1Element, createElement('f2'))
      );

      const result = findRightSiblings(element);

      expect(result).toStrictEqual([]);
    });

    it('returns siblings from different layers', () => {
      const element = createElement('t0');
      const f1Element = createElement('f1', null, createElement('s0', null, element), createElement('s1'));

      f1Element._reference = {};

      // The used tree
      //
      // Square bracket - the element for which we're looking for siblings
      // Parentheses    - the siblings for the above element
      // Curly braces   - the element with reference
      //
      //          root
      //        /  |   \
      //     f0   {f1}   f2
      //          /  \    \
      //         s0  (s1)  s2
      //         /
      //       [t0]
      actualizeElementTree(
        createElement('root', null, createElement('f0'), f1Element, createElement('f2', null, createElement('s2')))
      );

      const result = findRightSiblings(element);

      expect(result).toStrictEqual([expect.objectContaining({ type: 's1' })]);
    });
  });

  describe('findRightSiblings without parent with references', () => {
    it('returns first layer right siblings', () => {
      const element = createElement('s0');

      // The used tree
      //
      // Square bracket - the element for which we're looking for siblings
      // Parentheses    - the siblings for the above element
      //
      //          root
      //        /  |   \
      //     f0   (f1)   (f2)
      //    /      |
      //  [s0]     s1
      actualizeElementTree(
        createElement(
          'root',
          null,
          createElement('f0', null, element),
          createElement('f1', null, createElement('s1')),
          createElement('f2')
        )
      );

      const result = findRightSiblings(element);

      expect(result).toStrictEqual([expect.objectContaining({ type: 'f1' }), expect.objectContaining({ type: 'f2' })]);
    });

    it('returns first layer right siblings (only one left)', () => {
      const element = createElement('s1');

      // The used tree
      //
      // Square bracket - the element for which we're looking for siblings
      // Parentheses    - the sibling for the above element
      //
      //          root
      //        /  |   \
      //     f0    f1   (f2)
      //    /      |
      //   s0     [s1]
      actualizeElementTree(
        createElement(
          'root',
          null,
          createElement('f0', null, createElement('s0')),
          createElement('f1', null, element),
          createElement('f2')
        )
      );

      const result = findRightSiblings(element);

      expect(result).toStrictEqual([expect.objectContaining({ type: 'f2' })]);
    });

    it("returns [] when there's no siblings", () => {
      const element = createElement('f2');

      // The used tree
      //
      // Square bracket - the element for which we're looking for siblings
      //
      // The result is [], cause the rightmost element has no siblings
      //
      //          root
      //        /  |   \
      //     f0    f1   [f2]
      //    /      |
      //   s0      s1
      actualizeElementTree(
        createElement(
          'root',
          null,
          createElement('f0', null, createElement('s0')),
          createElement('f1', null, createElement('s1')),
          element
        )
      );

      const result = findRightSiblings(element);

      expect(result).toStrictEqual([]);
    });

    it("returns [] for the root element, cause there's no siblings", () => {
      // The used tree
      //
      // Square bracket - the element for which we're looking for siblings
      //
      // The result is [], cause the root has no siblings
      //
      //         [root]
      //        /  |   \
      //     f0    f1   f2
      //     /     |
      //    s0     s1
      const element = actualizeElementTree(
        createElement(
          'root',
          null,
          createElement('f0', null, createElement('s0')),
          createElement('f1', null, createElement('s1')),
          createElement('f2')
        )
      );

      const result = findRightSiblings(element);

      expect(result).toStrictEqual([]);
    });

    it('returns siblings from different layers', () => {
      const element = createElement('t0');

      // The used tree
      //
      // Square bracket - the element for which we're looking for siblings
      // Parentheses    - the siblings for the above element
      //
      //          root
      //        /  |   \
      //     f0    f1   (f2)
      //          /  \    \
      //         s0  (s1)  s2
      //         /
      //       [t0]
      actualizeElementTree(
        createElement(
          'root',
          null,
          createElement('f0'),
          createElement('f1', null, createElement('s0', null, element), createElement('s1')),
          createElement('f2', null, createElement('s2'))
        )
      );

      const result = findRightSiblings(element);

      expect(result).toStrictEqual([expect.objectContaining({ type: 's1' }), expect.objectContaining({ type: 'f2' })]);
    });
  });

  describe('findSiblingReference', () => {
    it('returns first layer right sibling reference', () => {
      const element = createElement('s0');
      const f1Element = createElement('f1', null, createElement('s1'));

      f1Element._reference = {};

      // The used tree
      //
      // Square bracket - the element for which we're looking for siblings
      // Parentheses    - the sibling for the above element with reference
      // Curly braces   - the parent element with reference
      //
      //         {root}
      //        /  |   \
      //     f0   (f1)   f2
      //    /      |
      //  [s0]     s1
      const tree = actualizeElementTree(
        createElement('root', null, createElement('f0', null, element), f1Element, createElement('f2'))
      );

      tree!._reference = {};

      const result = findSiblingReference(element);

      expect(result).toBe(f1Element._reference);
    });

    it("returns null since the parent element with reference doesn't have another children", () => {
      const element = createElement('s1');
      const f1Element = createElement('f1', null, element);

      f1Element._reference = {};

      // The used tree
      //
      // Parentheses    - the sibling for the above element
      // Curly braces   - the element with reference
      //
      //          root
      //        /  |   \
      //     f0   {f1}  f2
      //    /      |
      //   s0     [s1]
      actualizeElementTree(
        createElement('root', null, createElement('f0', null, createElement('s0')), f1Element, createElement('f2'))
      );

      const result = findSiblingReference(element);

      expect(result).toBe(null);
    });

    it('returns sibling reference from different layers', () => {
      const element = createElement('t0');
      const s1Element = createElement('s1');
      const f1Element = createElement('f1', null, createElement('s0', null, element), s1Element);

      f1Element._reference = {};
      s1Element._reference = {};

      // The used tree
      //
      // Square bracket - the element for which we're looking for siblings
      // Parentheses    - the siblings for the above element
      // Curly braces   - the element with reference
      //
      //          root
      //        /  |   \
      //     f0   {f1}   f2
      //          /  \    \
      //         s0  (s1)  s2
      //         /
      //       [t0]
      actualizeElementTree(
        createElement('root', null, createElement('f0'), f1Element, createElement('f2', null, createElement('s2')))
      );

      const result = findSiblingReference(element);

      expect(result).toBe(s1Element._reference);
    });
  });

  describe('findSiblingReference without parents with reference', () => {
    it('returns first layer sibling with reference', () => {
      const element = createElement('s0');
      const elementWithRef = createElement('f1', null, createElement('s1'));

      elementWithRef._reference = {};

      // The used tree
      //
      // Square bracket - the element for which we're looking for sibling
      // Parentheses    - the sibling for the above element with reference
      //
      //          root
      //        /  |   \
      //     f0   (f1)   f2
      //    /      |
      //  [s0]     s1
      actualizeElementTree(
        createElement('root', null, createElement('f0', null, element), elementWithRef, createElement('f2'))
      );

      const result = findSiblingReference(element);

      expect(result).toBe(elementWithRef._reference);
    });

    it('returns second layer sibling with reference', () => {
      const element = createElement('s0');
      const elementWithRef = createElement('s1');

      elementWithRef._reference = {};

      // The used tree
      //
      // Square bracket - the element for which we're looking for sibling
      // Parentheses    - the sibling for the above element with reference
      //
      //          root
      //        /  |   \
      //     f0    f1   f2
      //    /      |
      //  [s0]    (s1)
      actualizeElementTree(
        createElement(
          'root',
          null,
          createElement('f0', null, element),
          createElement('f1', null, elementWithRef),
          createElement('f2')
        )
      );

      const result = findSiblingReference(element);

      expect(result).toBe(elementWithRef._reference);
    });

    it('returns first layer right sibling reference', () => {
      const element = createElement('s1');
      const elementWithRef = createElement('f2');

      elementWithRef._reference = {};

      // The used tree
      //
      // Square bracket - the element for which we're looking for sibling
      // Parentheses    - the sibling with reference for the above element
      //
      //          root
      //        /  |   \
      //     f0    f1   (f2)
      //    /      |
      //   s0     [s1]
      actualizeElementTree(
        createElement(
          'root',
          null,
          createElement('f0', null, createElement('s0')),
          createElement('f1', null, element),
          elementWithRef
        )
      );

      const result = findSiblingReference(element);

      expect(result).toBe(elementWithRef._reference);
    });

    it("returns null when there's no siblings at all", () => {
      const element = createElement('f2');

      // The used tree
      //
      // Square bracket - the element for which we're looking for siblings
      //
      // The result is null, cause the rightmost element has no siblings
      //
      //          root
      //        /  |   \
      //     f0    f1   [f2]
      //    /      |
      //   s0      s1
      actualizeElementTree(
        createElement(
          'root',
          null,
          createElement('f0', null, createElement('s0')),
          createElement('f1', null, createElement('s1')),
          element
        )
      );

      const result = findSiblingReference(element);

      expect(result).toBeNull();
    });

    it("returns null for the root element, cause there's no siblings at all", () => {
      // The used tree
      //
      // Square bracket - the element for which we're looking for siblings
      //
      // The result is null, cause the root has no siblings
      //
      //         [root]
      //        /  |   \
      //     f0    f1   f2
      //     /     |
      //    s0     s1
      const element = actualizeElementTree(
        createElement(
          'root',
          null,
          createElement('f0', null, createElement('s0')),
          createElement('f1', null, createElement('s1')),
          createElement('f2')
        )
      );

      const result = findSiblingReference(element);

      expect(result).toBeNull();
    });

    it('returns sibling reference (a bit more complex tree)', () => {
      const element = createElement('t0');
      const elementWithRef = createElement('s1');
      const ignoredElementWithRef = createElement('f2', null, createElement('s2'));

      elementWithRef._reference = {};
      ignoredElementWithRef._reference = {};

      // The used tree
      //
      // Square bracket - the element for which we're looking for siblings
      // Parentheses    - the siblings with reference for the above element
      //
      //          root
      //        /  |   \
      //     f0    f1   (f2) - has to be ignored!
      //          /  \    \
      //         s0  (s1)  s2
      //         /
      //       [t0]
      actualizeElementTree(
        createElement(
          'root',
          null,
          createElement('f0'),
          createElement('f1', null, createElement('s0', null, element), elementWithRef),
          ignoredElementWithRef
        )
      );

      const result = findSiblingReference(element);

      expect(result).toBe(elementWithRef._reference);
      expect(result).not.toBe(ignoredElementWithRef._reference);
    });
  });
});
