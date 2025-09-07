export function patchStyle(prevAttrValue: any, nextAttrValue: any, dom: HTMLElement | SVGElement): void {
  if (nextAttrValue == null) {
    dom.removeAttribute('style');
    return;
  }

  const domStyle = dom.style;
  let style: string;
  let value: string;

  if (typeof nextAttrValue === 'string') {
    domStyle.cssText = nextAttrValue;
    return;
  }

  if (prevAttrValue != null && typeof prevAttrValue !== 'string') {
    for (style in nextAttrValue) {
      value = nextAttrValue[style];
      if (value !== prevAttrValue[style]) {
        domStyle.setProperty(camelToKebab(style), value);
      }
    }

    for (style in prevAttrValue) {
      if (nextAttrValue[style] == null) {
        domStyle.removeProperty(camelToKebab(style));
      }
    }
  } else {
    for (style in nextAttrValue) {
      value = nextAttrValue[style];
      domStyle.setProperty(camelToKebab(style), value);
    }
  }
}

function camelToKebab(name: string): string {
  return name.replace(/[A-Z]/g, match => '-' + match.toLowerCase());
}
