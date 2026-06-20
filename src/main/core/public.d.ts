import type { Maybe, Nullable, SimpText } from '@simpreact/shared';

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

export type ComponentType<P = {}> = FunctionalComponent<P>;

export type RefObject<T> = { current: T };
export type RefCallback<T> = {
  bivarianceHack(instance: T): (() => void | undefined) | void;
}['bivarianceHack'];
export type Ref<T> = RefCallback<T> | RefObject<T | null> | null;

export type Key = string | number | bigint;

export interface Attributes {
  key?: Key | null | undefined;
}

export interface RefAttributes<T> extends Attributes {
  ref?: Ref<T> | undefined;
}

export interface SimpElement<P = unknown, T extends string | FunctionalComponent<P> = string> {
  type?: T;
  props?: P;
  key?: string | null;
}

export type SimpNode = SimpElement | SimpText | Array<SimpNode> | boolean | null | undefined;

export declare function createElement<P extends {}, T>(
  type: string,
  props?: (RefAttributes<T> & P) | null,
  ...children: SimpNode[]
): SimpElement<P>;
export declare function createElement<P extends {}>(
  type: FunctionalComponent<P>,
  props?: (Attributes & P) | null,
  ...children: SimpNode[]
): SimpElement<P>;

export declare function createPortal<HostRef = {}>(children: SimpNode, container: HostRef): SimpElement;

export declare function Fragment(props: PropsWithChildren): SimpElement;

export type FunctionalComponent<P = {}> = (props: P) => SimpNode;
export type FC<P = {}> = FunctionalComponent<P>;

export type PropsWithChildren<P = {}> = P & { children?: SimpNode | undefined };

export declare function memo<P = {}>(
  Component: FC<P>,
  compare?: (objA: Readonly<P>, objB: Readonly<P>) => boolean
): FC<P>;

export declare function withSyncRerender(runtime: SimpRenderRuntime, callback: () => void): void;

export interface SimpRuntimeFCRenderer {
  (component: FC, element: SimpElement, renderRuntime: SimpRenderRuntime): SimpNode;
}

export interface SimpRenderRuntime {
  hostAdapter: HostAdapter;
  renderer: SimpRuntimeFCRenderer;
  renderStack: Array<{ node: SimpElement; kind: number; meta: any }>;
  elementToHostMap: Map<unknown, SimpElement>;
  currentRenderingFCElement: Nullable<SimpElement>;
  renderPhase: Nullable<number>;
}
