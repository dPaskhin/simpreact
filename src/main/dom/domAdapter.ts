import type { HostAdapter, SimpRenderRuntime } from '@simpreact/internal';
import { attachElementToDom, detachElementFromDom, getElementFromDom } from './attach-element-to-dom.js';
import { isExcludedFromHydration, isHydrating } from './hydrationState.js';
import type { Namespace } from './namespace.js';
import { defaultNamespace } from './namespace.js';
import { mountProps, patchProps, unmountProps } from './props/index.js';

interface HydrationCursorEntry {
  cursor: ChildNode | null;
  warned: boolean;
}

const hydrationCursorMaps = new WeakMap<SimpRenderRuntime, Map<Node, HydrationCursorEntry>>();

// Tracks, per real DOM parent, the next unclaimed child to adopt (lazily seeded from firstChild).
function getHydrationCursorEntry(parent: Node, renderRuntime: SimpRenderRuntime): HydrationCursorEntry {
  let map = hydrationCursorMaps.get(renderRuntime);
  if (!map) {
    map = new Map();
    hydrationCursorMaps.set(renderRuntime, map);
  }

  let entry = map.get(parent);
  if (!entry) {
    entry = { cursor: parent.firstChild, warned: false };
    map.set(parent, entry);
  }

  return entry;
}

function warnHydrationMismatch(entry: HydrationCursorEntry, message: string): void {
  if (!entry.warned) {
    entry.warned = true;
    console.warn(message);
  }
}

function isHydratingHere(renderRuntime: SimpRenderRuntime, parentReference: Node): boolean {
  return isHydrating(renderRuntime) && !isExcludedFromHydration(renderRuntime, parentReference);
}

export const domAdapter: HostAdapter<HTMLElement | SVGElement, Text, Namespace> = {
  createReference(type, renderRuntime, parentReference, namespace) {
    if (isHydratingHere(renderRuntime, parentReference)) {
      const entry = getHydrationCursorEntry(parentReference, renderRuntime);
      const candidate = entry.cursor;

      if (
        candidate &&
        candidate.nodeType === 1 &&
        (candidate as Element).tagName.toLowerCase() === type.toLowerCase()
      ) {
        entry.cursor = candidate.nextSibling;
        return candidate as HTMLElement | SVGElement;
      }

      warnHydrationMismatch(
        entry,
        `simpreact: hydration mismatch — expected <${type}>, creating a new element instead.`
      );

      const fresh = namespace ? document.createElementNS(namespace, type) : document.createElement(type);
      // Leave the mismatched candidate un-consumed so a later sibling that does match can still adopt it.
      parentReference.insertBefore(fresh, candidate);
      return fresh as HTMLElement | SVGElement;
    }

    if (namespace) {
      return document.createElementNS(namespace, type) as SVGElement;
    } else {
      return document.createElement(type);
    }
  },

  createTextReference(text, renderRuntime, parentReference) {
    if (isHydratingHere(renderRuntime, parentReference)) {
      const entry = getHydrationCursorEntry(parentReference, renderRuntime);
      const candidate = entry.cursor;

      if (candidate && candidate.nodeType === 3) {
        entry.cursor = candidate.nextSibling;
        if (candidate.nodeValue !== text) {
          candidate.nodeValue = text;
        }
        return candidate as Text;
      }

      warnHydrationMismatch(entry, 'simpreact: hydration mismatch — expected a text node, creating a new one instead.');

      const fresh = document.createTextNode(text);
      parentReference.insertBefore(fresh, candidate);
      return fresh;
    }

    return document.createTextNode(text);
  },

  mountProps(dom, element, renderRuntime, namespace) {
    mountProps(dom, element, namespace || defaultNamespace, renderRuntime);
  },

  patchProps(dom, prevElement, nextElement, renderRuntime, namespace) {
    patchProps(dom, prevElement, nextElement, namespace || defaultNamespace, renderRuntime);
  },

  unmountProps(dom, element, renderRuntime) {
    unmountProps(dom, element, renderRuntime);
  },

  setClassname(reference, className, namespace) {
    if (!className) {
      reference.removeAttribute('class');
    } else if (namespace === 'http://www.w3.org/2000/svg') {
      reference.setAttribute('class', className);
    } else {
      (reference as HTMLElement).className = className;
    }
  },

  setTextContent(reference, text, referenceHasOnlyTextElement) {
    if (referenceHasOnlyTextElement) {
      reference.firstChild!.nodeValue = text;
    } else {
      reference.textContent = text;
    }
  },

  insertOrAppend(parent, child, before) {
    // Skips the DOM write when child is already positioned correctly (e.g. after hydration adopted it).
    if (before) {
      if (child.nextSibling !== before) {
        parent.insertBefore(child, before);
      }
    } else if (parent.lastChild !== child) {
      parent.appendChild(child);
    }
  },

  removeChild(parent, child) {
    parent.removeChild(child);
  },

  replaceChild(parent, replacer, toBeReplaced) {
    parent.replaceChild(replacer, toBeReplaced);
  },

  clearNode(reference) {
    reference.textContent = '';
  },

  attachElementToReference(element, reference, renderRuntime) {
    attachElementToDom(element, reference, renderRuntime);
  },

  getElementFromReference(reference, renderRuntime) {
    return getElementFromDom(reference, renderRuntime);
  },

  detachElementFromReference(reference, renderRuntime) {
    detachElementFromDom(reference, renderRuntime);
  },

  getHostNamespaces(element, currentNamespace) {
    if (element.type === 'svg') {
      return {
        self: 'http://www.w3.org/2000/svg',
        children: 'http://www.w3.org/2000/svg',
      };
    }
    if (element.type === 'foreignObject') {
      return { self: 'http://www.w3.org/2000/svg', children: null };
    }
    if (currentNamespace && currentNamespace !== 'http://www.w3.org/1999/xhtml') {
      return { self: currentNamespace, children: currentNamespace };
    }
    return null;
  },
};
