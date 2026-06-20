import type { Maybe, Nullable } from '../shared/index.js';

export type FC = (props: any) => SimpNode;
export type Key = string | number | bigint;
export type SimpNode = SimpElement | string | number | bigint | boolean | Array<SimpNode> | null | undefined;

export interface SimpElement {
  flag: number;
  childFlag: number;
  parent: Nullable<SimpElement>;
  key: Nullable<Key>;
  type: Nullable<string | FC>;
  props: any;
  children: SimpNode;
  className: Nullable<string>;
  reference: unknown;
  hostNamespace: Nullable<string>;
  context: any;
  ref: any;
  unmounted: Nullable<boolean>;
  index: number;
}

export type RefObject<T> = { current: T };

export interface HostAdapter<HostRef = unknown, HostTextRef = unknown, NS = string> {
  createReference(type: string, namespace?: Maybe<NS>): HostRef;
  createTextReference(text: string): HostTextRef;
  mountProps(reference: HostRef, element: SimpElement, renderRuntime: SimpRenderRuntime, namespace?: Maybe<NS>): void;
  patchProps(
    reference: HostRef,
    prevElement: SimpElement,
    nextElement: SimpElement,
    renderRuntime: SimpRenderRuntime,
    namespace?: Maybe<NS>
  ): void;
  unmountProps(reference: HostRef, element: SimpElement, renderRuntime: SimpRenderRuntime): void;
  setClassname(reference: HostRef, className: Maybe<string>, namespace?: Maybe<NS>): void;
  setTextContent(reference: HostRef, text: string, referenceHasOnlyTextElement?: boolean): void;
  removeChild(parent: HostRef, child: HostRef | HostTextRef): void;
  replaceChild(parent: HostRef, replacer: HostRef | HostTextRef, toBeReplaced: HostRef | HostTextRef): void;
  insertOrAppend(parent: HostRef, child: HostRef | HostTextRef, before: Nullable<HostRef | HostTextRef>): void;
  clearNode(reference: HostRef | HostTextRef): void;
  attachElementToReference(
    element: SimpElement,
    reference: HostRef | HostTextRef,
    renderRuntime: SimpRenderRuntime
  ): void;
  detachElementFromReference(reference: HostRef | HostTextRef, renderRuntime: SimpRenderRuntime): void;
  getElementFromReference(reference: HostRef | HostTextRef, renderRuntime: SimpRenderRuntime): Nullable<SimpElement>;
  getHostNamespaces(
    element: SimpElement,
    currentNamespace: Maybe<NS>
  ): Nullable<{ self: Nullable<NS>; children: Nullable<NS> }>;
}

export interface SimpRuntimeFCRenderer {
  (component: FC, element: SimpElement, renderRuntime: SimpRenderRuntime): SimpNode;
}

export interface SimpRenderRuntime {
  hostAdapter: HostAdapter;
  renderer: SimpRuntimeFCRenderer;
  renderStack: Array<any>;
  elementToHostMap: Map<unknown, SimpElement>;
  currentRenderingFCElement: Nullable<SimpElement>;
  renderPhase: Nullable<0 | 1>;
}

export type LifecycleEvent =
  | { type: 'beforeRender'; element: SimpElement; renderRuntime: SimpRenderRuntime }
  | { type: 'afterRender'; element: SimpElement; renderRuntime: SimpRenderRuntime }
  | { type: 'triedToRerender'; element: SimpElement; renderRuntime: SimpRenderRuntime }
  | { type: 'mounted'; element: SimpElement; renderRuntime: SimpRenderRuntime }
  | { type: 'updated'; element: SimpElement; renderRuntime: SimpRenderRuntime }
  | { type: 'unmounted'; element: SimpElement; renderRuntime: SimpRenderRuntime }
  | { type: 'errored'; element: SimpElement; error: any; handled: boolean; renderRuntime: SimpRenderRuntime };

export interface LifecycleEventBus {
  publish(event: LifecycleEvent): void;
  subscribe(subscriber: (event: LifecycleEvent) => boolean | void): () => void;
}

export declare function isFC(element: { flag: number }): boolean;
export declare function isFragment(element: { flag: number }): boolean;
export declare function isHost(element: { flag: number }): boolean;
export declare function isPortal(element: { flag: number }): boolean;
export declare function isText(element: { flag: number }): boolean;
export declare function hasListChildren(element: { childFlag: number }): boolean;
export declare function hasElementChild(element: { childFlag: number }): boolean;

export declare function createElement(type: string | FC, props?: any, ...children: SimpNode[]): SimpElement;
export declare function Fragment(props: { children?: SimpNode }): SimpElement;

export declare function registerLifecyclePlugin(plugin: (bus: LifecycleEventBus) => void): void;

export declare function mount(
  element: SimpElement,
  parentReference: unknown,
  subtreeRightBoundary: Nullable<SimpElement>,
  context: unknown,
  hostNamespace: Maybe<string>,
  renderRuntime: SimpRenderRuntime
): void;

export declare function patch(
  prevElement: SimpElement,
  nextElement: SimpElement,
  parentReference: unknown,
  subtreeRightBoundary: Nullable<SimpElement>,
  context: unknown,
  hostNamespace: Maybe<string>,
  renderRuntime: SimpRenderRuntime
): void;

export declare function unmount(element: SimpElement, renderRuntime: SimpRenderRuntime): void;

export declare function rerender(element: SimpElement, renderRuntime: SimpRenderRuntime): void;
export declare function withSyncRerender(renderRuntime: SimpRenderRuntime, callback: () => void): void;

export declare const MOUNTING_PHASE: 0;
