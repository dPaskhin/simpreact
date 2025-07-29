export function patchStyle(prevAttrValue: any, nextAttrValue: any, dom: HTMLElement | SVGElement): void {
  if (nextAttrValue == null) {
    dom.removeAttribute('style');
    return;
  }

  const domStyle = dom.style;
  let style;
  let value;

  if (typeof nextAttrValue === 'string') {
    domStyle.cssText = nextAttrValue;
    return;
  }

  if (prevAttrValue != null && typeof prevAttrValue !== 'string') {
    for (style in nextAttrValue) {
      value = nextAttrValue[style];
      if (value !== prevAttrValue[style]) {
        domStyle.setProperty(style, value);
      }
    }

    for (style in prevAttrValue) {
      if (nextAttrValue[style] == null) {
        domStyle.removeProperty(style);
      }
    }
  } else {
    for (style in nextAttrValue) {
      value = nextAttrValue[style];
      domStyle.setProperty(style, value);
    }
  }
}
