import { updateDomNodeAttrs } from '../../main/dom/updateDomAttrs';

describe('updateDomAttrs function', () => {
  it('does nothing when node is null', () => {
    const prevAttrs = { id: 'prev' };
    const nextAttrs = { id: 'next' };

    updateDomNodeAttrs(null, prevAttrs, nextAttrs);
  });

  it('sets all attributes from nextAttrs when prevAttrs is null', () => {
    const node = document.createElement('div');
    const nextAttrs = { id: 'next', hidden: true, helloWorld: 'helloWorld', ['aria-label']: 'label' };

    updateDomNodeAttrs(node, null, nextAttrs);

    expect(node.id).toBe('next');
    expect(node.hidden).toBe(true);
    expect((node as any).helloWorld).toBe('helloWorld');
    expect((node as any)['aria-label']).toBe('label');
  });

  it('removes all attributes from prevAttrs when nextAttrs is null', () => {
    const node = document.createElement('div');

    node.id = 'prev';
    node.hidden = true;
    (node as any).helloWorld = 'prevHelloWorld';
    (node as any)['aria-label'] = 'prevLabel';

    const prevAttrs = { id: 'prev', hidden: true, helloWorld: 'prevHelloWorld', ['aria-label']: 'prevLabel' };

    updateDomNodeAttrs(node, prevAttrs, null);

    expect(node.id).toBe('');
    expect(node.hidden).toBe(false);
    expect((node as any).helloWorld).toBe('');
    expect((node as any)['aria-label']).toBe('');
  });

  it('updates only the changed attributes', () => {
    const node = document.createElement('div');

    node.id = 'prev';
    node.hidden = false;
    (node as any).helloWorld = 'prevHelloWorld';
    (node as any)['aria-label'] = 'prevLabel';

    const prevAttrs = { id: 'prev', hidden: false, helloWorld: 'prevHelloWorld', ['aria-label']: 'prevLabel' };
    const nextAttrs = { id: 'next', hidden: true, helloWorld: 'nextHelloWorld', ['aria-label']: 'nextLabel' };

    updateDomNodeAttrs(node, prevAttrs, nextAttrs);

    expect(node.id).toBe('next');
    expect(node.hidden).toBe(true);
    expect((node as any).helloWorld).toBe('nextHelloWorld');
    expect((node as any)['aria-label']).toBe('nextLabel');
  });

  it('does not update attributes when prevAttrs and nextAttrs are the same', () => {
    const node = document.createElement('div');

    node.id = 'prev';
    node.hidden = false;
    (node as any).helloworld = 'prevHelloWorld';
    (node as any)['aria-label'] = 'prevLabel';

    const prevAttrs = { id: 'prev', hidden: false, helloWorld: 'prevHelloWorld', ['aria-label']: 'prevLabel' };
    const nextAttrs = { id: 'prev', hidden: false, helloWorld: 'prevHelloWorld', ['aria-label']: 'prevLabel' };

    updateDomNodeAttrs(node, prevAttrs, nextAttrs);

    expect(node.id).toBe('prev');
    expect(node.hidden).toBe(false);
    expect((node as any).helloworld).toBe('prevHelloWorld');
    expect((node as any)['aria-label']).toBe('prevLabel');
  });

  it('adds event listeners from nextAttrs', () => {
    const node = { addEventListener: jest.fn() } as unknown as Element;
    const nextAttrs = { onClick: () => console.log('Clicked') };

    updateDomNodeAttrs(node, null, nextAttrs);

    expect(node.addEventListener).toHaveBeenCalledWith('click', nextAttrs.onClick);
  });

  it('removes event listeners from prevAttrs', () => {
    const clickHandler = () => console.log('Clicked');

    const node = {
      removeEventListener: jest.fn(),
      addEventListener: jest.fn(),
    } as unknown as Element;

    const prevAttrs = { onClick: clickHandler };
    const nextAttrs = { onClick: null };

    updateDomNodeAttrs(node, prevAttrs, nextAttrs);

    expect(node.removeEventListener).toHaveBeenCalledWith('click', clickHandler);
    expect(node.addEventListener).not.toHaveBeenCalled();
  });

  it('updates event listeners when they change', () => {
    const prevClickHandler = () => console.log('Previous Clicked');
    const nextClickHandler = () => console.log('Next Clicked');

    const node = {
      removeEventListener: jest.fn(),
      addEventListener: jest.fn(),
    } as unknown as Element;

    const prevAttrs = { onClick: prevClickHandler };
    const nextAttrs = { onClick: nextClickHandler };
    updateDomNodeAttrs(node, prevAttrs, nextAttrs);

    expect(node.removeEventListener).toHaveBeenCalledWith('click', prevClickHandler);
    expect(node.addEventListener).toHaveBeenCalledWith('click', nextClickHandler);
  });

  it('updates nodeValue when it changes between prevAttrs and nextAttrs', () => {
    const node = document.createTextNode('');

    node.nodeValue = 'old value';

    const prevAttrs = { nodeValue: 'old value' };
    const nextAttrs = { nodeValue: 'new value' };

    updateDomNodeAttrs(node, prevAttrs, nextAttrs);

    expect(node.nodeValue).toBe('new value');
  });

  it('removes nodeValue when it is not present in nextAttrs', () => {
    const node = document.createTextNode('');

    node.nodeValue = 'old value';

    const prevAttrs = { nodeValue: 'old value' };
    const nextAttrs = { nodeValue: null };

    updateDomNodeAttrs(node, prevAttrs, nextAttrs);

    expect(node.nodeValue).toBe('');
  });

  it('updates complex attributes correctly', () => {
    const node = { data: { old: true } } as any;

    const prevAttrs = { data: { old: true } };
    const nextAttrs = { data: { old: false } };

    updateDomNodeAttrs(node, prevAttrs, nextAttrs);

    expect(node.data).toEqual({ old: false });
  });

  it('adds new attributes and removes missing ones', () => {
    const node = document.createElement('div');

    node.id = 'old-id';
    (node as any).label = 'old-label';

    const prevAttrs = { id: 'old-id', label: 'old-label' };
    const nextAttrs = { id: 'new-id', title: 'new-title' };

    updateDomNodeAttrs(node, prevAttrs, nextAttrs);

    expect(node.id).toBe('new-id');
    expect((node as any).label).toBe('');
    expect(node.title).toBe('new-title');
  });
});
