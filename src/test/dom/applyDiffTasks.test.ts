import { applyDiffTasks } from '../../main/dom/applyDiffTasks';
import { DiffTask, SimpElement } from '../../main/dom/types';
import { createElement } from '../../main';
import { EFFECT_TAG } from '../../main/diff';
import { actualizeElementTree } from '../diff/diff.test';

describe('applyDiffTasks', () => {
  it('does nothing when diffTasks array is empty', () => {
    // No assertions needed, just verifying that no errors are thrown.
    applyDiffTasks([]);
  });

  it('creates a new element, applies attributes, and appends it to the parent when effectTag is INSERT', () => {
    const parent = createElement('div');

    parent._reference = document.createElement('div');

    jest.spyOn(parent._reference as Element, 'insertBefore');

    const nextElement = createElement('span', { id: 'new-element', className: 'new-class' }) as SimpElement;

    nextElement._parent = parent;

    const task = { effectTag: EFFECT_TAG.INSERT, prevElement: null, nextElement };

    applyDiffTasks([task]);

    expect(nextElement._reference).toBeInstanceOf(HTMLElement);
    expect((nextElement._reference as Element).id).toBe('new-element');
    expect((nextElement._reference as Element).className).toBe('new-class');
    expect((parent._reference as Element).insertBefore).toHaveBeenCalledWith(nextElement._reference, null);
  });

  it('removes the element from its parent when effectTag is DELETE', () => {
    const parent = createElement('div');

    parent._reference = document.createElement('div');

    jest.spyOn(parent._reference as Element, 'removeChild');

    const prevElement = createElement('span') as SimpElement;

    prevElement._parent = parent;
    prevElement._reference = document.createElement('span');

    (parent._reference as Element).appendChild(prevElement._reference);

    const task = { effectTag: EFFECT_TAG.REMOVE, prevElement, nextElement: null };
    applyDiffTasks([task]);

    expect((parent._reference as Element).removeChild).toHaveBeenCalledWith(prevElement._reference);
  });

  it('updates the attributes of an existing element when effectTag is UPDATE', () => {
    const prevElement = createElement('div', { id: 'old-id', className: 'old-class' }) as SimpElement;

    prevElement._reference = document.createElement('div');

    const nextElement = createElement('div', { id: 'new-id', className: 'new-class' }) as SimpElement;

    nextElement._reference = prevElement._reference;

    const task = { effectTag: EFFECT_TAG.UPDATE, prevElement, nextElement };

    applyDiffTasks([task]);

    expect(prevElement._reference.id).toBe('new-id');
    expect(prevElement._reference.className).toBe('new-class');
  });

  it('handles null or undefined elements gracefully', () => {
    const taskInsert = { effectTag: EFFECT_TAG.INSERT, nextElement: null } as DiffTask;
    const taskDelete = { effectTag: EFFECT_TAG.REMOVE, prevElement: null } as DiffTask;
    const taskUpdate = { effectTag: EFFECT_TAG.UPDATE, prevElement: null, nextElement: null } as DiffTask;

    // No assertions needed, just verifying that no errors are thrown.
    applyDiffTasks([taskInsert, taskDelete, taskUpdate]);
  });

  it('does nothing in UPDATE case if prevElement._reference is null', () => {
    const prevElement = createElement('div', { id: 'old-id' }) as SimpElement;
    const nextElement = createElement('div', { id: 'new-id' }) as SimpElement;

    const task = { effectTag: EFFECT_TAG.UPDATE, prevElement, nextElement };

    applyDiffTasks([task]);

    // Since prevElement._reference is null, no updates should be applied
    expect(nextElement._reference).toBeNull();
  });

  it('removes reserved attributes like children in INSERT and UPDATE cases', () => {
    const node = document.createElement('div');
    const prevElement = createElement('div', { id: 'old-id', children: 'child-text' }) as SimpElement;

    prevElement._reference = node;

    const nextElement = createElement('div', { id: 'new-id', children: 'child-text' }) as SimpElement;

    nextElement._reference = node;

    const taskUpdate = { effectTag: EFFECT_TAG.UPDATE, prevElement, nextElement };

    applyDiffTasks([taskUpdate]);

    expect(node.id).toBe('new-id');
    expect(node.children.length).toBe(0); // Ensures children attribute is not directly applied
  });

  it('correctly handles a sequence of INSERT, DELETE, and UPDATE tasks', () => {
    const elementToInsert = createElement('span', { id: 'inserted-element' }) as SimpElement;
    const elementToDelete = createElement('div') as SimpElement;
    const elementToUpdate = createElement('div', { id: 'element' }) as SimpElement;
    const updatedElement = createElement('div', { id: 'updatedElement' }) as SimpElement;
    const parentElement = createElement('div', null, elementToInsert, elementToUpdate, elementToDelete) as SimpElement;

    parentElement._reference = document.createElement('div');
    elementToDelete._reference = document.createElement('div');
    elementToUpdate._reference = document.createElement('div');
    updatedElement._reference = elementToUpdate._reference;

    parentElement._reference.append(elementToUpdate._reference, elementToDelete._reference);

    actualizeElementTree(parentElement);

    const tasks = [
      { effectTag: EFFECT_TAG.INSERT, prevElement: null, nextElement: elementToInsert },
      { effectTag: EFFECT_TAG.REMOVE, prevElement: elementToDelete, nextElement: null },
      { effectTag: EFFECT_TAG.UPDATE, prevElement: elementToUpdate, nextElement: updatedElement },
    ];
    applyDiffTasks(tasks);

    // Check INSERT
    expect(elementToInsert._reference).toBeInstanceOf(HTMLElement);
    expect((elementToInsert._reference as HTMLElement).id).toBe('inserted-element');
    expect(parentElement._reference.contains(elementToInsert._reference)).toBe(true);

    // Check DELETE
    expect(parentElement._reference.contains(elementToDelete._reference)).toBe(false);

    // Check UPDATE
    expect(updatedElement._reference.id).toBe('updatedElement');

    expect(Array.from(parentElement._reference.children)).toStrictEqual([
      elementToInsert._reference,
      updatedElement._reference,
    ]);
  });

  it('correctly handles a sequence of DELETE and INSERT tasks', () => {
    const parentElement = createElement('div') as SimpElement;
    parentElement._reference = document.createElement('div');

    // DELETE task
    const deleteElement = createElement('s') as SimpElement;
    deleteElement._reference = document.createElement('s');
    deleteElement._parent = parentElement;

    const middleElement = document.createElement('b');

    parentElement._reference.appendChild(deleteElement._reference);
    parentElement._reference.appendChild(middleElement);

    // INSERT task
    const insertElement = createElement('span', { id: 'inserted-element' }) as SimpElement;
    insertElement._parent = parentElement;

    const tasks = [
      { effectTag: EFFECT_TAG.REMOVE, prevElement: deleteElement, nextElement: null },
      { effectTag: EFFECT_TAG.INSERT, prevElement: null, nextElement: insertElement },
    ];
    applyDiffTasks(tasks);

    expect(Array.from(parentElement._reference.children)).toStrictEqual([middleElement, insertElement._reference]);

    // Check INSERT
    expect(insertElement._reference).toBeInstanceOf(HTMLElement);
    expect((insertElement._reference as HTMLElement).id).toBe('inserted-element');

    // Check DELETE
    expect(parentElement._reference.contains(deleteElement._reference)).toBe(false);
  });
});
