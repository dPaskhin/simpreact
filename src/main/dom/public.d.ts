import type { RefAttributes, SimpElement, SimpNode } from '@simpreact/core';
import type { Nullable } from '@simpreact/shared';

import type { PropertiesHyphen } from 'csstype';

export type Booleanish = boolean | 'true' | 'false';

/**
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/crossorigin MDN}
 */
export type CrossOrigin = 'anonymous' | 'use-credentials' | '' | undefined;

export interface SimpRoot {
  render(element: SimpElement): void;

  unmount(): void;
}

declare function createRoot(container: Element | DocumentFragment): SimpRoot;

declare function render(element: SimpElement, parentReference: Nullable<HTMLElement>): void;

export interface SimpReactHTMLElement<T extends HTMLElement>
  extends DetailedSimpReactHTMLElement<AllHTMLAttributes<T>, T> {}

export type DetailedHTMLProps<E extends HTMLAttributes<T>, T> = RefAttributes<T> & E;

export interface DetailedSimpReactHTMLElement<P extends HTMLAttributes<T>, T extends HTMLElement>
  extends SimpElement<P> {
  type: HTMLElementType;
}

export interface SimpReactSVGElement extends SimpElement<SVGAttributes<SVGElement>> {
  type: SVGElementType;
}

export interface SVGProps<T> extends SVGAttributes<T>, RefAttributes<T> {}

export type HTMLElementType =
  | 'a'
  | 'abbr'
  | 'address'
  | 'area'
  | 'article'
  | 'aside'
  | 'audio'
  | 'b'
  | 'base'
  | 'bdi'
  | 'bdo'
  | 'big'
  | 'blockquote'
  | 'body'
  | 'br'
  | 'button'
  | 'canvas'
  | 'caption'
  | 'center'
  | 'cite'
  | 'code'
  | 'col'
  | 'colgroup'
  | 'data'
  | 'datalist'
  | 'dd'
  | 'del'
  | 'details'
  | 'dfn'
  | 'dialog'
  | 'div'
  | 'dl'
  | 'dt'
  | 'em'
  | 'embed'
  | 'fieldset'
  | 'figcaption'
  | 'figure'
  | 'footer'
  | 'form'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'head'
  | 'header'
  | 'hgroup'
  | 'hr'
  | 'html'
  | 'i'
  | 'iframe'
  | 'img'
  | 'input'
  | 'ins'
  | 'kbd'
  | 'keygen'
  | 'label'
  | 'legend'
  | 'li'
  | 'link'
  | 'main'
  | 'map'
  | 'mark'
  | 'menu'
  | 'menuitem'
  | 'meta'
  | 'meter'
  | 'nav'
  | 'noscript'
  | 'object'
  | 'ol'
  | 'optgroup'
  | 'option'
  | 'output'
  | 'p'
  | 'param'
  | 'picture'
  | 'pre'
  | 'progress'
  | 'q'
  | 'rp'
  | 'rt'
  | 'ruby'
  | 's'
  | 'samp'
  | 'search'
  | 'slot'
  | 'script'
  | 'section'
  | 'select'
  | 'small'
  | 'source'
  | 'span'
  | 'strong'
  | 'style'
  | 'sub'
  | 'summary'
  | 'sup'
  | 'table'
  | 'template'
  | 'tbody'
  | 'td'
  | 'textarea'
  | 'tfoot'
  | 'th'
  | 'thead'
  | 'time'
  | 'title'
  | 'tr'
  | 'track'
  | 'u'
  | 'ul'
  | 'var'
  | 'video'
  | 'wbr'
  | 'webview';

export type SVGElementType =
  | 'animate'
  | 'circle'
  | 'clipPath'
  | 'defs'
  | 'desc'
  | 'ellipse'
  | 'feBlend'
  | 'feColorMatrix'
  | 'feComponentTransfer'
  | 'feComposite'
  | 'feConvolveMatrix'
  | 'feDiffuseLighting'
  | 'feDisplacementMap'
  | 'feDistantLight'
  | 'feDropShadow'
  | 'feFlood'
  | 'feFuncA'
  | 'feFuncB'
  | 'feFuncG'
  | 'feFuncR'
  | 'feGaussianBlur'
  | 'feImage'
  | 'feMerge'
  | 'feMergeNode'
  | 'feMorphology'
  | 'feOffset'
  | 'fePointLight'
  | 'feSpecularLighting'
  | 'feSpotLight'
  | 'feTile'
  | 'feTurbulence'
  | 'filter'
  | 'foreignObject'
  | 'g'
  | 'image'
  | 'line'
  | 'linearGradient'
  | 'marker'
  | 'mask'
  | 'metadata'
  | 'path'
  | 'pattern'
  | 'polygon'
  | 'polyline'
  | 'radialGradient'
  | 'rect'
  | 'stop'
  | 'svg'
  | 'switch'
  | 'symbol'
  | 'text'
  | 'textPath'
  | 'tspan'
  | 'use'
  | 'view';

export interface SyntheticEvent<C = Element, E = Event> {
  nativeEvent: E;
  currentTarget: EventTarget & C;
  target: EventTarget;

  isDefaultPrevented: boolean;
  isPropagationStopped: boolean;
  type: string;

  preventDefault(): void;

  stopPropagation(): void;
}

export type EventHandler<E extends SyntheticEvent<any>> = { bivarianceHack(event: E): void }['bivarianceHack'];
export type NativeEventHandler<E extends Event = Event> = { bivarianceHack(event: E): void }['bivarianceHack'];

export type ClipboardEventHandler = NativeEventHandler<ClipboardEvent>;
export type CompositionEventHandler = NativeEventHandler<CompositionEvent>;
export type DragEventHandler = NativeEventHandler<DragEvent>;
export type FocusEventHandler = NativeEventHandler<FocusEvent>;
export type FocusInOutEventHandler<T = Element> = EventHandler<SyntheticEvent<T>>;
export type KeyboardEventHandler<T = Element> = EventHandler<SyntheticEvent<T, KeyboardEvent>>;
export type MouseEventHandler<T = Element> = EventHandler<SyntheticEvent<T, MouseEvent>>;
export type NativeMouseEventHandler = NativeEventHandler<MouseEvent>;
export type TouchEventHandler<T = Element> = EventHandler<SyntheticEvent<T, TouchEvent>>;
export type NativeTouchEventHandler = NativeEventHandler<TouchEvent>;
export type PointerEventHandler<T = Element> = EventHandler<SyntheticEvent<T, PointerEvent>>;
export type NativePointerEventHandler = NativeEventHandler<PointerEvent>;
export type UIEventHandler = NativeEventHandler<UIEvent>;
export type WheelEventHandler = NativeEventHandler<WheelEvent>;
export type AnimationEventHandler = NativeEventHandler<AnimationEvent>;
export type ToggleEventHandler = NativeEventHandler<ToggleEvent>;
export type TransitionEventHandler = NativeEventHandler<TransitionEvent>;

export interface AllHTMLAttributes<T> extends HTMLAttributes<T> {
  // Standard HTML Attributes
  accept?: string | undefined;
  acceptCharset?: string | undefined;
  action?: string | undefined;
  allowFullScreen?: boolean | undefined;
  allowTransparency?: boolean | undefined;
  alt?: string | undefined;
  as?: string | undefined;
  async?: boolean | undefined;
  autoComplete?: string | undefined;
  autoPlay?: boolean | undefined;
  capture?: boolean | 'user' | 'environment' | undefined;
  cellPadding?: number | string | undefined;
  cellSpacing?: number | string | undefined;
  charSet?: string | undefined;
  challenge?: string | undefined;
  checked?: boolean | undefined;
  cite?: string | undefined;
  classID?: string | undefined;
  cols?: number | undefined;
  colSpan?: number | undefined;
  controls?: boolean | undefined;
  coords?: string | undefined;
  crossOrigin?: CrossOrigin;
  data?: string | undefined;
  dateTime?: string | undefined;
  default?: boolean | undefined;
  defer?: boolean | undefined;
  disabled?: boolean | undefined;
  download?: any;
  encType?: string | undefined;
  form?: string | undefined;
  formAction?: string | undefined;
  formEncType?: string | undefined;
  formMethod?: string | undefined;
  formNoValidate?: boolean | undefined;
  formTarget?: string | undefined;
  frameBorder?: number | string | undefined;
  headers?: string | undefined;
  height?: number | string | undefined;
  high?: number | undefined;
  href?: string | undefined;
  hrefLang?: string | undefined;
  htmlFor?: string | undefined;
  httpEquiv?: string | undefined;
  integrity?: string | undefined;
  keyParams?: string | undefined;
  keyType?: string | undefined;
  kind?: string | undefined;
  label?: string | undefined;
  list?: string | undefined;
  loop?: boolean | undefined;
  low?: number | undefined;
  manifest?: string | undefined;
  marginHeight?: number | undefined;
  marginWidth?: number | undefined;
  max?: number | string | undefined;
  maxLength?: number | undefined;
  media?: string | undefined;
  mediaGroup?: string | undefined;
  method?: string | undefined;
  min?: number | string | undefined;
  minLength?: number | undefined;
  multiple?: boolean | undefined;
  muted?: boolean | undefined;
  name?: string | undefined;
  noValidate?: boolean | undefined;
  open?: boolean | undefined;
  optimum?: number | undefined;
  pattern?: string | undefined;
  placeholder?: string | undefined;
  playsInline?: boolean | undefined;
  poster?: string | undefined;
  preload?: string | undefined;
  readOnly?: boolean | undefined;
  required?: boolean | undefined;
  reversed?: boolean | undefined;
  rows?: number | undefined;
  rowSpan?: number | undefined;
  sandbox?: string | undefined;
  scope?: string | undefined;
  scoped?: boolean | undefined;
  scrolling?: string | undefined;
  seamless?: boolean | undefined;
  selected?: boolean | undefined;
  shape?: string | undefined;
  size?: number | undefined;
  sizes?: string | undefined;
  span?: number | undefined;
  src?: string | undefined;
  srcDoc?: string | undefined;
  srcLang?: string | undefined;
  srcSet?: string | undefined;
  start?: number | undefined;
  step?: number | string | undefined;
  summary?: string | undefined;
  target?: string | undefined;
  type?: string | undefined;
  useMap?: string | undefined;
  value?: string | readonly string[] | number | undefined;
  width?: number | string | undefined;
  wmode?: string | undefined;
  wrap?: string | undefined;
}

export type HTMLAttributeReferrerPolicy =
  | ''
  | 'no-referrer'
  | 'no-referrer-when-downgrade'
  | 'origin'
  | 'origin-when-cross-origin'
  | 'same-origin'
  | 'strict-origin'
  | 'strict-origin-when-cross-origin'
  | 'unsafe-url';

export type HTMLAttributeAnchorTarget = '_self' | '_blank' | '_parent' | '_top' | (string & {});

export interface AnchorHTMLAttributes<T> extends HTMLAttributes<T> {
  download?: any;
  href?: string | undefined;
  hrefLang?: string | undefined;
  media?: string | undefined;
  ping?: string | undefined;
  target?: HTMLAttributeAnchorTarget | undefined;
  type?: string | undefined;
  referrerPolicy?: HTMLAttributeReferrerPolicy | undefined;
}

export interface AudioHTMLAttributes<T> extends MediaHTMLAttributes<T> {}

export interface AreaHTMLAttributes<T> extends HTMLAttributes<T> {
  alt?: string | undefined;
  coords?: string | undefined;
  download?: any;
  href?: string | undefined;
  hrefLang?: string | undefined;
  media?: string | undefined;
  referrerPolicy?: HTMLAttributeReferrerPolicy | undefined;
  shape?: string | undefined;
  target?: string | undefined;
}

export interface BaseHTMLAttributes<T> extends HTMLAttributes<T> {
  href?: string | undefined;
  target?: string | undefined;
}

export interface BlockquoteHTMLAttributes<T> extends HTMLAttributes<T> {
  cite?: string | undefined;
}

export interface ButtonHTMLAttributes<T> extends HTMLAttributes<T> {
  disabled?: boolean | undefined;
  form?: string | undefined;
  formAction?: string | undefined;
  formEncType?: string | undefined;
  formMethod?: string | undefined;
  formNoValidate?: boolean | undefined;
  formTarget?: string | undefined;
  name?: string | undefined;
  type?: 'submit' | 'reset' | 'button' | undefined;
  value?: string | readonly string[] | number | undefined;
}

export interface CanvasHTMLAttributes<T> extends HTMLAttributes<T> {
  height?: number | string | undefined;
  width?: number | string | undefined;
}

export interface ColHTMLAttributes<T> extends HTMLAttributes<T> {
  span?: number | undefined;
  width?: number | string | undefined;
}

export interface ColgroupHTMLAttributes<T> extends HTMLAttributes<T> {
  span?: number | undefined;
}

export interface DataHTMLAttributes<T> extends HTMLAttributes<T> {
  value?: string | readonly string[] | number | undefined;
}

export interface DetailsHTMLAttributes<T> extends HTMLAttributes<T> {
  open?: boolean | undefined;
  name?: string | undefined;
}

export interface DelHTMLAttributes<T> extends HTMLAttributes<T> {
  cite?: string | undefined;
  dateTime?: string | undefined;
}

export interface DialogHTMLAttributes<T> extends HTMLAttributes<T> {
  onCancel?: NativeEventHandler | undefined;
  onClose?: NativeEventHandler | undefined;
  open?: boolean | undefined;
}

export interface EmbedHTMLAttributes<T> extends HTMLAttributes<T> {
  height?: number | string | undefined;
  src?: string | undefined;
  type?: string | undefined;
  width?: number | string | undefined;
}

export interface FieldsetHTMLAttributes<T> extends HTMLAttributes<T> {
  disabled?: boolean | undefined;
  form?: string | undefined;
  name?: string | undefined;
}

export interface FormHTMLAttributes<T> extends HTMLAttributes<T> {
  acceptCharset?: string | undefined;
  action?: string | undefined;
  autoComplete?: string | undefined;
  encType?: string | undefined;
  method?: string | undefined;
  name?: string | undefined;
  noValidate?: boolean | undefined;
  target?: string | undefined;
}

export interface HtmlHTMLAttributes<T> extends HTMLAttributes<T> {
  manifest?: string | undefined;
}

export interface IframeHTMLAttributes<T> extends HTMLAttributes<T> {
  allow?: string | undefined;
  allowFullScreen?: boolean | undefined;
  allowTransparency?: boolean | undefined;
  /** @deprecated */
  frameBorder?: number | string | undefined;
  height?: number | string | undefined;
  loading?: 'eager' | 'lazy' | undefined;
  /** @deprecated */
  marginHeight?: number | undefined;
  /** @deprecated */
  marginWidth?: number | undefined;
  name?: string | undefined;
  referrerPolicy?: HTMLAttributeReferrerPolicy | undefined;
  sandbox?: string | undefined;
  /** @deprecated */
  scrolling?: string | undefined;
  seamless?: boolean | undefined;
  src?: string | undefined;
  srcDoc?: string | undefined;
  width?: number | string | undefined;
}

export interface ImgHTMLAttributes<T> extends HTMLAttributes<T> {
  alt?: string | undefined;
  crossOrigin?: CrossOrigin;
  decoding?: 'async' | 'auto' | 'sync' | undefined;
  fetchPriority?: 'high' | 'low' | 'auto';
  height?: number | string | undefined;
  loading?: 'eager' | 'lazy' | undefined;
  referrerPolicy?: HTMLAttributeReferrerPolicy | undefined;
  sizes?: string | undefined;
  src?: string | undefined;
  srcSet?: string | undefined;
  useMap?: string | undefined;
  width?: number | string | undefined;
}

export interface InsHTMLAttributes<T> extends HTMLAttributes<T> {
  cite?: string | undefined;
  dateTime?: string | undefined;
}

export type HTMLInputTypeAttribute =
  | 'button'
  | 'checkbox'
  | 'color'
  | 'date'
  | 'datetime-local'
  | 'email'
  | 'file'
  | 'hidden'
  | 'image'
  | 'month'
  | 'number'
  | 'password'
  | 'radio'
  | 'range'
  | 'reset'
  | 'search'
  | 'submit'
  | 'tel'
  | 'text'
  | 'time'
  | 'url'
  | 'week'
  | (string & {});

export type AutoFillAddressKind = 'billing' | 'shipping';
export type AutoFillBase = '' | 'off' | 'on';
export type AutoFillContactField =
  | 'email'
  | 'tel'
  | 'tel-area-code'
  | 'tel-country-code'
  | 'tel-extension'
  | 'tel-local'
  | 'tel-local-prefix'
  | 'tel-local-suffix'
  | 'tel-national';
export type AutoFillContactKind = 'home' | 'mobile' | 'work';
export type AutoFillCredentialField = 'webauthn';
export type AutoFillNormalField =
  | 'additional-name'
  | 'address-level1'
  | 'address-level2'
  | 'address-level3'
  | 'address-level4'
  | 'address-line1'
  | 'address-line2'
  | 'address-line3'
  | 'bday-day'
  | 'bday-month'
  | 'bday-year'
  | 'cc-csc'
  | 'cc-exp'
  | 'cc-exp-month'
  | 'cc-exp-year'
  | 'cc-family-name'
  | 'cc-given-name'
  | 'cc-name'
  | 'cc-number'
  | 'cc-type'
  | 'country'
  | 'country-name'
  | 'current-password'
  | 'family-name'
  | 'given-name'
  | 'honorific-prefix'
  | 'honorific-suffix'
  | 'name'
  | 'new-password'
  | 'one-time-code'
  | 'organization'
  | 'postal-code'
  | 'street-address'
  | 'transaction-amount'
  | 'transaction-currency'
  | 'username';
export type OptionalPrefixToken<T extends string> = `${T} ` | '';
export type OptionalPostfixToken<T extends string> = ` ${T}` | '';
export type AutoFillField = AutoFillNormalField | `${OptionalPrefixToken<AutoFillContactKind>}${AutoFillContactField}`;
export type AutoFillSection = `section-${string}`;
export type AutoFill =
  | AutoFillBase
  | `${OptionalPrefixToken<AutoFillSection>}${OptionalPrefixToken<AutoFillAddressKind>}${AutoFillField}${OptionalPostfixToken<AutoFillCredentialField>}`;
export type HTMLInputAutoCompleteAttribute = AutoFill | (string & {});

export interface InputHTMLAttributes<T> extends HTMLAttributes<T> {
  accept?: string | undefined;
  alt?: string | undefined;
  autoComplete?: HTMLInputAutoCompleteAttribute | undefined;
  capture?: boolean | 'user' | 'environment' | undefined; // https://www.w3.org/TR/html-media-capture/#the-capture-attribute
  checked?: boolean | undefined;
  disabled?: boolean | undefined;
  form?: string | undefined;
  formAction?: string | undefined;
  formEncType?: string | undefined;
  formMethod?: string | undefined;
  formNoValidate?: boolean | undefined;
  formTarget?: string | undefined;
  height?: number | string | undefined;
  list?: string | undefined;
  max?: number | string | undefined;
  maxLength?: number | undefined;
  min?: number | string | undefined;
  minLength?: number | undefined;
  multiple?: boolean | undefined;
  name?: string | undefined;
  pattern?: string | undefined;
  placeholder?: string | undefined;
  readOnly?: boolean | undefined;
  required?: boolean | undefined;
  size?: number | undefined;
  src?: string | undefined;
  step?: number | string | undefined;
  type?: HTMLInputTypeAttribute | undefined;
  value?: string | readonly string[] | number | undefined;
  width?: number | string | undefined;
}

export interface KeygenHTMLAttributes<T> extends HTMLAttributes<T> {
  challenge?: string | undefined;
  disabled?: boolean | undefined;
  form?: string | undefined;
  keyType?: string | undefined;
  keyParams?: string | undefined;
  name?: string | undefined;
}

export interface LabelHTMLAttributes<T> extends HTMLAttributes<T> {
  form?: string | undefined;
  htmlFor?: string | undefined;
}

export interface LiHTMLAttributes<T> extends HTMLAttributes<T> {
  value?: string | readonly string[] | number | undefined;
}

export interface LinkHTMLAttributes<T> extends HTMLAttributes<T> {
  as?: string | undefined;
  crossOrigin?: CrossOrigin;
  fetchPriority?: 'high' | 'low' | 'auto';
  href?: string | undefined;
  hrefLang?: string | undefined;
  integrity?: string | undefined;
  media?: string | undefined;
  imageSrcSet?: string | undefined;
  imageSizes?: string | undefined;
  referrerPolicy?: HTMLAttributeReferrerPolicy | undefined;
  sizes?: string | undefined;
  type?: string | undefined;
  charSet?: string | undefined;

  // React props
  precedence?: string | undefined;
}

export interface MapHTMLAttributes<T> extends HTMLAttributes<T> {
  name?: string | undefined;
}

export interface MenuHTMLAttributes<T> extends HTMLAttributes<T> {
  type?: string | undefined;
}

export interface MediaHTMLAttributes<T> extends HTMLAttributes<T> {
  autoPlay?: boolean | undefined;
  controls?: boolean | undefined;
  controlsList?: string | undefined;
  crossOrigin?: CrossOrigin;
  loop?: boolean | undefined;
  mediaGroup?: string | undefined;
  muted?: boolean | undefined;
  playsInline?: boolean | undefined;
  preload?: string | undefined;
  src?: string | undefined;
}

export interface MetaHTMLAttributes<T> extends HTMLAttributes<T> {
  charSet?: string | undefined;
  content?: string | undefined;
  httpEquiv?: string | undefined;
  media?: string | undefined;
  name?: string | undefined;
}

export interface MeterHTMLAttributes<T> extends HTMLAttributes<T> {
  form?: string | undefined;
  high?: number | undefined;
  low?: number | undefined;
  max?: number | string | undefined;
  min?: number | string | undefined;
  optimum?: number | undefined;
  value?: string | readonly string[] | number | undefined;
}

export interface QuoteHTMLAttributes<T> extends HTMLAttributes<T> {
  cite?: string | undefined;
}

export interface ObjectHTMLAttributes<T> extends HTMLAttributes<T> {
  classID?: string | undefined;
  data?: string | undefined;
  form?: string | undefined;
  height?: number | string | undefined;
  name?: string | undefined;
  type?: string | undefined;
  useMap?: string | undefined;
  width?: number | string | undefined;
  wmode?: string | undefined;
}

export interface OlHTMLAttributes<T> extends HTMLAttributes<T> {
  reversed?: boolean | undefined;
  start?: number | undefined;
  type?: '1' | 'a' | 'A' | 'i' | 'I' | undefined;
}

export interface OptgroupHTMLAttributes<T> extends HTMLAttributes<T> {
  disabled?: boolean | undefined;
  label?: string | undefined;
}

export interface OptionHTMLAttributes<T> extends HTMLAttributes<T> {
  disabled?: boolean | undefined;
  label?: string | undefined;
  selected?: boolean | undefined;
  value?: string | readonly string[] | number | undefined;
}

export interface OutputHTMLAttributes<T> extends HTMLAttributes<T> {
  form?: string | undefined;
  htmlFor?: string | undefined;
  name?: string | undefined;
}

export interface ParamHTMLAttributes<T> extends HTMLAttributes<T> {
  name?: string | undefined;
  value?: string | readonly string[] | number | undefined;
}

export interface ProgressHTMLAttributes<T> extends HTMLAttributes<T> {
  max?: number | string | undefined;
  value?: string | readonly string[] | number | undefined;
}

export interface SlotHTMLAttributes<T> extends HTMLAttributes<T> {
  name?: string | undefined;
}

export interface ScriptHTMLAttributes<T> extends HTMLAttributes<T> {
  async?: boolean | undefined;
  /** @deprecated */
  charSet?: string | undefined;
  crossOrigin?: CrossOrigin;
  defer?: boolean | undefined;
  integrity?: string | undefined;
  noModule?: boolean | undefined;
  referrerPolicy?: HTMLAttributeReferrerPolicy | undefined;
  src?: string | undefined;
  type?: string | undefined;
}

export interface SelectHTMLAttributes<T> extends HTMLAttributes<T> {
  autoComplete?: string | undefined;
  disabled?: boolean | undefined;
  form?: string | undefined;
  multiple?: boolean | undefined;
  name?: string | undefined;
  required?: boolean | undefined;
  size?: number | undefined;
  value?: string | readonly string[] | number | undefined;
}

export interface SourceHTMLAttributes<T> extends HTMLAttributes<T> {
  height?: number | string | undefined;
  media?: string | undefined;
  sizes?: string | undefined;
  src?: string | undefined;
  srcSet?: string | undefined;
  type?: string | undefined;
  width?: number | string | undefined;
}

export interface StyleHTMLAttributes<T> extends HTMLAttributes<T> {
  media?: string | undefined;
  scoped?: boolean | undefined;
  type?: string | undefined;

  // React props
  href?: string | undefined;
  precedence?: string | undefined;
}

export interface TableHTMLAttributes<T> extends HTMLAttributes<T> {
  align?: 'left' | 'center' | 'right' | undefined;
  bgcolor?: string | undefined;
  border?: number | undefined;
  cellPadding?: number | string | undefined;
  cellSpacing?: number | string | undefined;
  frame?: boolean | undefined;
  rules?: 'none' | 'groups' | 'rows' | 'columns' | 'all' | undefined;
  summary?: string | undefined;
  width?: number | string | undefined;
}

export interface TextareaHTMLAttributes<T> extends HTMLAttributes<T> {
  autoComplete?: string | undefined;
  cols?: number | undefined;
  dirName?: string | undefined;
  disabled?: boolean | undefined;
  form?: string | undefined;
  maxLength?: number | undefined;
  minLength?: number | undefined;
  name?: string | undefined;
  placeholder?: string | undefined;
  readOnly?: boolean | undefined;
  required?: boolean | undefined;
  rows?: number | undefined;
  value?: string | readonly string[] | number | undefined;
  wrap?: string | undefined;
}

export interface TdHTMLAttributes<T> extends HTMLAttributes<T> {
  align?: 'left' | 'center' | 'right' | 'justify' | 'char' | undefined;
  colSpan?: number | undefined;
  headers?: string | undefined;
  rowSpan?: number | undefined;
  scope?: string | undefined;
  abbr?: string | undefined;
  height?: number | string | undefined;
  width?: number | string | undefined;
  valign?: 'top' | 'middle' | 'bottom' | 'baseline' | undefined;
}

export interface ThHTMLAttributes<T> extends HTMLAttributes<T> {
  align?: 'left' | 'center' | 'right' | 'justify' | 'char' | undefined;
  colSpan?: number | undefined;
  headers?: string | undefined;
  rowSpan?: number | undefined;
  scope?: string | undefined;
  abbr?: string | undefined;
}

export interface TimeHTMLAttributes<T> extends HTMLAttributes<T> {
  dateTime?: string | undefined;
}

export interface TrackHTMLAttributes<T> extends HTMLAttributes<T> {
  default?: boolean | undefined;
  kind?: string | undefined;
  label?: string | undefined;
  src?: string | undefined;
  srcLang?: string | undefined;
}

export interface VideoHTMLAttributes<T> extends MediaHTMLAttributes<T> {
  height?: number | string | undefined;
  playsInline?: boolean | undefined;
  poster?: string | undefined;
  width?: number | string | undefined;
  disablePictureInPicture?: boolean | undefined;
  disableRemotePlayback?: boolean | undefined;
}

export interface SVGAttributes<T> extends AriaAttributes, DOMAttributes<T> {
  // Attributes which also defined in HTMLAttributes
  // See comment in SVGDOMPropertyConfig.js
  className?: string | undefined;
  color?: string | undefined;
  height?: number | string | undefined;
  id?: string | undefined;
  lang?: string | undefined;
  max?: number | string | undefined;
  media?: string | undefined;
  method?: string | undefined;
  min?: number | string | undefined;
  name?: string | undefined;
  style?: PropertiesHyphen | string | null | undefined | CssVariables;
  target?: string | undefined;
  type?: string | undefined;
  width?: number | string | undefined;

  // Other HTML properties supported by SVG elements in browsers
  role?: AriaRole | undefined;
  tabIndex?: number | undefined;
  crossOrigin?: CrossOrigin;

  // SVG Specific attributes
  accentHeight?: number | string | undefined;
  accumulate?: 'none' | 'sum' | undefined;
  additive?: 'replace' | 'sum' | undefined;
  alignmentBaseline?:
    | 'auto'
    | 'baseline'
    | 'before-edge'
    | 'text-before-edge'
    | 'middle'
    | 'central'
    | 'after-edge'
    | 'text-after-edge'
    | 'ideographic'
    | 'alphabetic'
    | 'hanging'
    | 'mathematical'
    | 'inherit'
    | undefined;
  allowReorder?: 'no' | 'yes' | undefined;
  alphabetic?: number | string | undefined;
  amplitude?: number | string | undefined;
  arabicForm?: 'initial' | 'medial' | 'terminal' | 'isolated' | undefined;
  ascent?: number | string | undefined;
  attributeName?: string | undefined;
  attributeType?: string | undefined;
  autoReverse?: Booleanish | undefined;
  azimuth?: number | string | undefined;
  baseFrequency?: number | string | undefined;
  baselineShift?: number | string | undefined;
  baseProfile?: number | string | undefined;
  bbox?: number | string | undefined;
  begin?: number | string | undefined;
  bias?: number | string | undefined;
  by?: number | string | undefined;
  calcMode?: number | string | undefined;
  capHeight?: number | string | undefined;
  clip?: number | string | undefined;
  clipPath?: string | undefined;
  clipPathUnits?: number | string | undefined;
  clipRule?: number | string | undefined;
  colorInterpolation?: number | string | undefined;
  colorInterpolationFilters?: 'auto' | 'sRGB' | 'linearRGB' | 'inherit' | undefined;
  colorProfile?: number | string | undefined;
  colorRendering?: number | string | undefined;
  contentScriptType?: number | string | undefined;
  contentStyleType?: number | string | undefined;
  cursor?: number | string | undefined;
  cx?: number | string | undefined;
  cy?: number | string | undefined;
  d?: string | undefined;
  decelerate?: number | string | undefined;
  descent?: number | string | undefined;
  diffuseConstant?: number | string | undefined;
  direction?: number | string | undefined;
  display?: number | string | undefined;
  divisor?: number | string | undefined;
  dominantBaseline?: number | string | undefined;
  dur?: number | string | undefined;
  dx?: number | string | undefined;
  dy?: number | string | undefined;
  edgeMode?: number | string | undefined;
  elevation?: number | string | undefined;
  enableBackground?: number | string | undefined;
  end?: number | string | undefined;
  exponent?: number | string | undefined;
  externalResourcesRequired?: Booleanish | undefined;
  fill?: string | undefined;
  fillOpacity?: number | string | undefined;
  fillRule?: 'nonzero' | 'evenodd' | 'inherit' | undefined;
  filter?: string | undefined;
  filterRes?: number | string | undefined;
  filterUnits?: number | string | undefined;
  floodColor?: number | string | undefined;
  floodOpacity?: number | string | undefined;
  focusable?: Booleanish | 'auto' | undefined;
  fontFamily?: string | undefined;
  fontSize?: number | string | undefined;
  fontSizeAdjust?: number | string | undefined;
  fontStretch?: number | string | undefined;
  fontStyle?: number | string | undefined;
  fontVariant?: number | string | undefined;
  fontWeight?: number | string | undefined;
  format?: number | string | undefined;
  fr?: number | string | undefined;
  from?: number | string | undefined;
  fx?: number | string | undefined;
  fy?: number | string | undefined;
  g1?: number | string | undefined;
  g2?: number | string | undefined;
  glyphName?: number | string | undefined;
  glyphOrientationHorizontal?: number | string | undefined;
  glyphOrientationVertical?: number | string | undefined;
  glyphRef?: number | string | undefined;
  gradientTransform?: string | undefined;
  gradientUnits?: string | undefined;
  hanging?: number | string | undefined;
  horizAdvX?: number | string | undefined;
  horizOriginX?: number | string | undefined;
  href?: string | undefined;
  ideographic?: number | string | undefined;
  imageRendering?: number | string | undefined;
  in2?: number | string | undefined;
  in?: string | undefined;
  intercept?: number | string | undefined;
  k1?: number | string | undefined;
  k2?: number | string | undefined;
  k3?: number | string | undefined;
  k4?: number | string | undefined;
  k?: number | string | undefined;
  kernelMatrix?: number | string | undefined;
  kernelUnitLength?: number | string | undefined;
  kerning?: number | string | undefined;
  keyPoints?: number | string | undefined;
  keySplines?: number | string | undefined;
  keyTimes?: number | string | undefined;
  lengthAdjust?: number | string | undefined;
  letterSpacing?: number | string | undefined;
  lightingColor?: number | string | undefined;
  limitingConeAngle?: number | string | undefined;
  local?: number | string | undefined;
  markerEnd?: string | undefined;
  markerHeight?: number | string | undefined;
  markerMid?: string | undefined;
  markerStart?: string | undefined;
  markerUnits?: number | string | undefined;
  markerWidth?: number | string | undefined;
  mask?: string | undefined;
  maskContentUnits?: number | string | undefined;
  maskUnits?: number | string | undefined;
  mathematical?: number | string | undefined;
  mode?: number | string | undefined;
  numOctaves?: number | string | undefined;
  offset?: number | string | undefined;
  opacity?: number | string | undefined;
  operator?: number | string | undefined;
  order?: number | string | undefined;
  orient?: number | string | undefined;
  orientation?: number | string | undefined;
  origin?: number | string | undefined;
  overflow?: number | string | undefined;
  overlinePosition?: number | string | undefined;
  overlineThickness?: number | string | undefined;
  paintOrder?: number | string | undefined;
  panose1?: number | string | undefined;
  path?: string | undefined;
  pathLength?: number | string | undefined;
  patternContentUnits?: string | undefined;
  patternTransform?: number | string | undefined;
  patternUnits?: string | undefined;
  pointerEvents?: number | string | undefined;
  points?: string | undefined;
  pointsAtX?: number | string | undefined;
  pointsAtY?: number | string | undefined;
  pointsAtZ?: number | string | undefined;
  preserveAlpha?: Booleanish | undefined;
  preserveAspectRatio?: string | undefined;
  primitiveUnits?: number | string | undefined;
  r?: number | string | undefined;
  radius?: number | string | undefined;
  refX?: number | string | undefined;
  refY?: number | string | undefined;
  renderingIntent?: number | string | undefined;
  repeatCount?: number | string | undefined;
  repeatDur?: number | string | undefined;
  requiredExtensions?: number | string | undefined;
  requiredFeatures?: number | string | undefined;
  restart?: number | string | undefined;
  result?: string | undefined;
  rotate?: number | string | undefined;
  rx?: number | string | undefined;
  ry?: number | string | undefined;
  scale?: number | string | undefined;
  seed?: number | string | undefined;
  shapeRendering?: number | string | undefined;
  slope?: number | string | undefined;
  spacing?: number | string | undefined;
  specularConstant?: number | string | undefined;
  specularExponent?: number | string | undefined;
  speed?: number | string | undefined;
  spreadMethod?: string | undefined;
  startOffset?: number | string | undefined;
  stdDeviation?: number | string | undefined;
  stemh?: number | string | undefined;
  stemv?: number | string | undefined;
  stitchTiles?: number | string | undefined;
  stopColor?: string | undefined;
  stopOpacity?: number | string | undefined;
  strikethroughPosition?: number | string | undefined;
  strikethroughThickness?: number | string | undefined;
  string?: number | string | undefined;
  stroke?: string | undefined;
  strokeDasharray?: string | number | undefined;
  strokeDashoffset?: string | number | undefined;
  strokeLinecap?: 'butt' | 'round' | 'square' | 'inherit' | undefined;
  strokeLinejoin?: 'miter' | 'round' | 'bevel' | 'inherit' | undefined;
  strokeMiterlimit?: number | string | undefined;
  strokeOpacity?: number | string | undefined;
  strokeWidth?: number | string | undefined;
  surfaceScale?: number | string | undefined;
  systemLanguage?: number | string | undefined;
  tableValues?: number | string | undefined;
  targetX?: number | string | undefined;
  targetY?: number | string | undefined;
  textAnchor?: string | undefined;
  textDecoration?: number | string | undefined;
  textLength?: number | string | undefined;
  textRendering?: number | string | undefined;
  to?: number | string | undefined;
  transform?: string | undefined;
  u1?: number | string | undefined;
  u2?: number | string | undefined;
  underlinePosition?: number | string | undefined;
  underlineThickness?: number | string | undefined;
  unicode?: number | string | undefined;
  unicodeBidi?: number | string | undefined;
  unicodeRange?: number | string | undefined;
  unitsPerEm?: number | string | undefined;
  vAlphabetic?: number | string | undefined;
  values?: string | undefined;
  vectorEffect?: number | string | undefined;
  version?: string | undefined;
  vertAdvY?: number | string | undefined;
  vertOriginX?: number | string | undefined;
  vertOriginY?: number | string | undefined;
  vHanging?: number | string | undefined;
  vIdeographic?: number | string | undefined;
  viewBox?: string | undefined;
  viewTarget?: number | string | undefined;
  visibility?: number | string | undefined;
  vMathematical?: number | string | undefined;
  widths?: number | string | undefined;
  wordSpacing?: number | string | undefined;
  writingMode?: number | string | undefined;
  x1?: number | string | undefined;
  x2?: number | string | undefined;
  x?: number | string | undefined;
  xChannelSelector?: string | undefined;
  xHeight?: number | string | undefined;
  xlinkActuate?: string | undefined;
  xlinkArcrole?: string | undefined;
  xlinkHref?: string | undefined;
  xlinkRole?: string | undefined;
  xlinkShow?: string | undefined;
  xlinkTitle?: string | undefined;
  xlinkType?: string | undefined;
  xmlBase?: string | undefined;
  xmlLang?: string | undefined;
  xmlns?: string | undefined;
  xmlnsXlink?: string | undefined;
  xmlSpace?: string | undefined;
  y1?: number | string | undefined;
  y2?: number | string | undefined;
  y?: number | string | undefined;
  yChannelSelector?: string | undefined;
  z?: number | string | undefined;
  zoomAndPan?: string | undefined;
}

export interface WebViewHTMLAttributes<T> extends HTMLAttributes<T> {
  allowFullScreen?: boolean | undefined;
  allowpopups?: boolean | undefined;
  autosize?: boolean | undefined;
  blinkfeatures?: string | undefined;
  disableblinkfeatures?: string | undefined;
  disableguestresize?: boolean | undefined;
  disablewebsecurity?: boolean | undefined;
  guestinstance?: string | undefined;
  httpreferrer?: string | undefined;
  nodeintegration?: boolean | undefined;
  partition?: string | undefined;
  plugins?: boolean | undefined;
  preload?: string | undefined;
  src?: string | undefined;
  useragent?: string | undefined;
  webpreferences?: string | undefined;
}

export interface CssVariables {
  [key: `--${string}`]: string;
}

export interface HTMLAttributes<T> extends AriaAttributes, DOMAttributes<T> {
  // SimpReact-specific Attributes
  class?: string | null | undefined;

  // Standard HTML Attributes
  accessKey?: string | undefined;
  autoCapitalize?: 'off' | 'none' | 'on' | 'sentences' | 'words' | 'characters' | undefined | (string & {});
  autoFocus?: boolean | undefined;
  className?: string | undefined;
  contentEditable?: Booleanish | 'inherit' | 'plaintext-only' | undefined;
  contextMenu?: string | undefined;
  dir?: string | undefined;
  draggable?: Booleanish | undefined;
  enterKeyHint?: 'enter' | 'done' | 'go' | 'next' | 'previous' | 'search' | 'send' | undefined;
  hidden?: boolean | undefined;
  id?: string | undefined;
  lang?: string | undefined;
  nonce?: string | undefined;
  slot?: string | undefined;
  spellCheck?: Booleanish | undefined;
  style?: PropertiesHyphen | string | null | undefined | CssVariables;
  tabIndex?: number | undefined;
  title?: string | undefined;
  translate?: 'yes' | 'no' | undefined;

  // Unknown
  radioGroup?: string | undefined; // <command>, <menuitem>

  // WAI-ARIA
  role?: AriaRole | undefined;

  // RDFa Attributes
  about?: string | undefined;
  content?: string | undefined;
  datatype?: string | undefined;
  inlist?: any;
  prefix?: string | undefined;
  property?: string | undefined;
  rel?: string | undefined;
  resource?: string | undefined;
  rev?: string | undefined;
  typeof?: string | undefined;
  vocab?: string | undefined;

  // Non-standard Attributes
  autoCorrect?: string | undefined;
  autoSave?: string | undefined;
  color?: string | undefined;
  itemProp?: string | undefined;
  itemScope?: boolean | undefined;
  itemType?: string | undefined;
  itemID?: string | undefined;
  itemRef?: string | undefined;
  results?: number | undefined;
  security?: string | undefined;
  unselectable?: 'on' | 'off' | undefined;

  // Popover API
  popover?: '' | 'auto' | 'manual' | undefined;
  popoverTargetAction?: 'toggle' | 'show' | 'hide' | undefined;
  popoverTarget?: string | undefined;

  // Living Standard
  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/inert
   */
  inert?: boolean | undefined;
  /**
   * @see {@link https://html.spec.whatwg.org/multipage/interaction.html#input-modalities:-the-inputmode-attribute}
   */
  inputMode?: 'none' | 'text' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal' | 'search' | undefined;
  /**
   * @see {@link https://html.spec.whatwg.org/multipage/custom-elements.html#attr-is}
   */
  is?: string | undefined;
}

export type AriaRole =
  | 'alert'
  | 'alertdialog'
  | 'application'
  | 'article'
  | 'banner'
  | 'button'
  | 'cell'
  | 'checkbox'
  | 'columnheader'
  | 'combobox'
  | 'complementary'
  | 'contentinfo'
  | 'definition'
  | 'dialog'
  | 'directory'
  | 'document'
  | 'feed'
  | 'figure'
  | 'form'
  | 'grid'
  | 'gridcell'
  | 'group'
  | 'heading'
  | 'img'
  | 'link'
  | 'list'
  | 'listbox'
  | 'listitem'
  | 'log'
  | 'main'
  | 'marquee'
  | 'math'
  | 'menu'
  | 'menubar'
  | 'menuitem'
  | 'menuitemcheckbox'
  | 'menuitemradio'
  | 'navigation'
  | 'none'
  | 'note'
  | 'option'
  | 'presentation'
  | 'progressbar'
  | 'radio'
  | 'radiogroup'
  | 'region'
  | 'row'
  | 'rowgroup'
  | 'rowheader'
  | 'scrollbar'
  | 'search'
  | 'searchbox'
  | 'separator'
  | 'slider'
  | 'spinbutton'
  | 'status'
  | 'switch'
  | 'tab'
  | 'table'
  | 'tablist'
  | 'tabpanel'
  | 'term'
  | 'textbox'
  | 'timer'
  | 'toolbar'
  | 'tooltip'
  | 'tree'
  | 'treegrid'
  | 'treeitem'
  | (string & {});

export interface AriaAttributes {
  /** Identifies the currently active element when DOM focus is on a composite widget, textbox, group, or application. */
  'aria-activedescendant'?: string | undefined;
  /** Indicates whether assistive technologies will present all, or only parts of, the changed region based on the change notifications defined by the aria-relevant attribute. */
  'aria-atomic'?: Booleanish | undefined;
  /**
   * Indicates whether inputting text could trigger display of one or more predictions of the user's intended value for an input and specifies how predictions would be
   * presented if they are made.
   */
  'aria-autocomplete'?: 'none' | 'inline' | 'list' | 'both' | undefined;
  /** Indicates an element is being modified and that assistive technologies MAY want to wait until the modifications are complete before exposing them to the user. */
  /**
   * Defines a string value that labels the current element, which is intended to be converted into Braille.
   * @see aria-label.
   */
  'aria-braillelabel'?: string | undefined;
  /**
   * Defines a human-readable, author-localized abbreviated description for the role of an element, which is intended to be converted into Braille.
   * @see aria-roledescription.
   */
  'aria-brailleroledescription'?: string | undefined;
  'aria-busy'?: Booleanish | undefined;
  /**
   * Indicates the current "checked" state of checkboxes, radio buttons, and other widgets.
   * @see aria-pressed @see aria-selected.
   */
  'aria-checked'?: boolean | 'false' | 'mixed' | 'true' | undefined;
  /**
   * Defines the total number of columns in a table, grid, or treegrid.
   * @see aria-colindex.
   */
  'aria-colcount'?: number | undefined;
  /**
   * Defines an element's column index or position with respect to the total number of columns within a table, grid, or treegrid.
   * @see aria-colcount @see aria-colspan.
   */
  'aria-colindex'?: number | undefined;
  /**
   * Defines a human readable text alternative of aria-colindex.
   * @see aria-rowindextext.
   */
  'aria-colindextext'?: string | undefined;
  /**
   * Defines the number of columns spanned by a cell or gridcell within a table, grid, or treegrid.
   * @see aria-colindex @see aria-rowspan.
   */
  'aria-colspan'?: number | undefined;
  /**
   * Identifies the element (or elements) whose contents or presence are controlled by the current element.
   * @see aria-owns.
   */
  'aria-controls'?: string | undefined;
  /** Indicates the element that represents the current item within a container or set of related elements. */
  'aria-current'?: boolean | 'false' | 'true' | 'page' | 'step' | 'location' | 'date' | 'time' | undefined;
  /**
   * Identifies the element (or elements) that describes the object.
   * @see aria-labelledby
   */
  'aria-describedby'?: string | undefined;
  /**
   * Defines a string value that describes or annotates the current element.
   * @see related aria-describedby.
   */
  'aria-description'?: string | undefined;
  /**
   * Identifies the element that provides a detailed, extended description for the object.
   * @see aria-describedby.
   */
  'aria-details'?: string | undefined;
  /**
   * Indicates that the element is perceivable but disabled, so it is not editable or otherwise operable.
   * @see aria-hidden @see aria-readonly.
   */
  'aria-disabled'?: Booleanish | undefined;
  /**
   * Indicates what functions can be performed when a dragged object is released on the drop target.
   * @deprecated in ARIA 1.1
   */
  'aria-dropeffect'?: 'none' | 'copy' | 'execute' | 'link' | 'move' | 'popup' | undefined;
  /**
   * Identifies the element that provides an error message for the object.
   * @see aria-invalid @see aria-describedby.
   */
  'aria-errormessage'?: string | undefined;
  /** Indicates whether the element, or another grouping element it controls, is currently expanded or collapsed. */
  'aria-expanded'?: Booleanish | undefined;
  /**
   * Identifies the next element (or elements) in an alternate reading order of content which, at the user's discretion,
   * allows assistive technology to override the general default of reading in document source order.
   */
  'aria-flowto'?: string | undefined;
  /**
   * Indicates an element's "grabbed" state in a drag-and-drop operation.
   * @deprecated in ARIA 1.1
   */
  'aria-grabbed'?: Booleanish | undefined;
  /** Indicates the availability and type of interactive popup element, such as menu or dialog, that can be triggered by an element. */
  'aria-haspopup'?: boolean | 'false' | 'true' | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog' | undefined;
  /**
   * Indicates whether the element is exposed to an accessibility API.
   * @see aria-disabled.
   */
  'aria-hidden'?: Booleanish | undefined;
  /**
   * Indicates the entered value does not conform to the format expected by the application.
   * @see aria-errormessage.
   */
  'aria-invalid'?: boolean | 'false' | 'true' | 'grammar' | 'spelling' | undefined;
  /** Indicates keyboard shortcuts that an author has implemented to activate or give focus to an element. */
  'aria-keyshortcuts'?: string | undefined;
  /**
   * Defines a string value that labels the current element.
   * @see aria-labelledby.
   */
  'aria-label'?: string | undefined;
  /**
   * Identifies the element (or elements) that labels the current element.
   * @see aria-describedby.
   */
  'aria-labelledby'?: string | undefined;
  /** Defines the hierarchical level of an element within a structure. */
  'aria-level'?: number | undefined;
  /** Indicates that an element will be updated, and describes the types of updates the user agents, assistive technologies, and user can expect from the live region. */
  'aria-live'?: 'off' | 'assertive' | 'polite' | undefined;
  /** Indicates whether an element is modal when displayed. */
  'aria-modal'?: Booleanish | undefined;
  /** Indicates whether a text box accepts multiple lines of input or only a single line. */
  'aria-multiline'?: Booleanish | undefined;
  /** Indicates that the user may select more than one item from the current selectable descendants. */
  'aria-multiselectable'?: Booleanish | undefined;
  /** Indicates whether the element's orientation is horizontal, vertical, or unknown/ambiguous. */
  'aria-orientation'?: 'horizontal' | 'vertical' | undefined;
  /**
   * Identifies an element (or elements) in order to define a visual, functional, or contextual parent/child relationship
   * between DOM elements where the DOM hierarchy cannot be used to represent the relationship.
   * @see aria-controls.
   */
  'aria-owns'?: string | undefined;
  /**
   * Defines a short hint (a word or short phrase) intended to aid the user with data entry when the control has no value.
   * A hint could be a sample value or a brief description of the expected format.
   */
  'aria-placeholder'?: string | undefined;
  /**
   * Defines an element's number or position in the current set of listitems or treeitems. Not required if all elements in the set are present in the DOM.
   * @see aria-setsize.
   */
  'aria-posinset'?: number | undefined;
  /**
   * Indicates the current "pressed" state of toggle buttons.
   * @see aria-checked @see aria-selected.
   */
  'aria-pressed'?: boolean | 'false' | 'mixed' | 'true' | undefined;
  /**
   * Indicates that the element is not editable, but is otherwise operable.
   * @see aria-disabled.
   */
  'aria-readonly'?: Booleanish | undefined;
  /**
   * Indicates what notifications the user agent will trigger when the accessibility tree within a live region is modified.
   * @see aria-atomic.
   */
  'aria-relevant'?:
    | 'additions'
    | 'additions removals'
    | 'additions text'
    | 'all'
    | 'removals'
    | 'removals additions'
    | 'removals text'
    | 'text'
    | 'text additions'
    | 'text removals'
    | undefined;
  /** Indicates that user input is required on the element before a form may be submitted. */
  'aria-required'?: Booleanish | undefined;
  /** Defines a human-readable, author-localized description for the role of an element. */
  'aria-roledescription'?: string | undefined;
  /**
   * Defines the total number of rows in a table, grid, or treegrid.
   * @see aria-rowindex.
   */
  'aria-rowcount'?: number | undefined;
  /**
   * Defines an element's row index or position with respect to the total number of rows within a table, grid, or treegrid.
   * @see aria-rowcount @see aria-rowspan.
   */
  'aria-rowindex'?: number | undefined;
  /**
   * Defines a human readable text alternative of aria-rowindex.
   * @see aria-colindextext.
   */
  'aria-rowindextext'?: string | undefined;
  /**
   * Defines the number of rows spanned by a cell or gridcell within a table, grid, or treegrid.
   * @see aria-rowindex @see aria-colspan.
   */
  'aria-rowspan'?: number | undefined;
  /**
   * Indicates the current "selected" state of various widgets.
   * @see aria-checked @see aria-pressed.
   */
  'aria-selected'?: Booleanish | undefined;
  /**
   * Defines the number of items in the current set of listitems or treeitems. Not required if all elements in the set are present in the DOM.
   * @see aria-posinset.
   */
  'aria-setsize'?: number | undefined;
  /** Indicates if items in a table or grid are sorted in ascending or descending order. */
  'aria-sort'?: 'none' | 'ascending' | 'descending' | 'other' | undefined;
  /** Defines the maximum allowed value for a range widget. */
  'aria-valuemax'?: number | undefined;
  /** Defines the minimum allowed value for a range widget. */
  'aria-valuemin'?: number | undefined;
  /**
   * Defines the current value for a range widget.
   * @see aria-valuetext.
   */
  'aria-valuenow'?: number | undefined;
  /** Defines the human readable text alternative of aria-valuenow for a range widget. */
  'aria-valuetext'?: string | undefined;
}

export interface DOMAttributes<T> {
  children?: SimpNode | undefined;
  dangerouslySetInnerHTML?: { __html: string } | undefined;

  // Clipboard Events
  onCopy?: ClipboardEventHandler | undefined;
  onCopyCapture?: ClipboardEventHandler | undefined;
  onCut?: ClipboardEventHandler | undefined;
  onCutCapture?: ClipboardEventHandler | undefined;
  onPaste?: ClipboardEventHandler | undefined;
  onPasteCapture?: ClipboardEventHandler | undefined;

  // Composition Events
  onCompositionEnd?: CompositionEventHandler | undefined;
  onCompositionEndCapture?: CompositionEventHandler | undefined;
  onCompositionStart?: CompositionEventHandler | undefined;
  onCompositionStartCapture?: CompositionEventHandler | undefined;
  onCompositionUpdate?: CompositionEventHandler | undefined;
  onCompositionUpdateCapture?: CompositionEventHandler | undefined;

  // Focus Events
  onFocusIn?: FocusInOutEventHandler<T> | undefined;
  onFocusInCapture?: FocusInOutEventHandler<T> | undefined;
  onFocusOut?: FocusInOutEventHandler<T> | undefined;
  onFocusOutCapture?: FocusInOutEventHandler<T> | undefined;
  onFocus?: FocusEventHandler | undefined;
  onBlur?: FocusEventHandler | undefined;

  // Form Events
  onChange?: NativeEventHandler | undefined;
  onChangeCapture?: NativeEventHandler | undefined;
  onBeforeInput?: NativeEventHandler | undefined;
  onBeforeInputCapture?: NativeEventHandler | undefined;
  onInput?: NativeEventHandler | undefined;
  onReset?: NativeEventHandler | undefined;
  onResetCapture?: NativeEventHandler | undefined;
  onSubmit?: NativeEventHandler | undefined;
  onSubmitCapture?: NativeEventHandler | undefined;
  onInvalid?: NativeEventHandler | undefined;

  // Image Events
  onLoad?: NativeEventHandler | undefined;
  onError?: NativeEventHandler | undefined; // also a Media Event

  // Keyboard Events
  onKeyDown?: KeyboardEventHandler<T> | undefined;
  onKeyDownCapture?: KeyboardEventHandler<T> | undefined;
  onKeyUp?: KeyboardEventHandler<T> | undefined;
  onKeyUpCapture?: KeyboardEventHandler<T> | undefined;

  // Media Events
  onAbort?: NativeEventHandler | undefined;
  onCanPlay?: NativeEventHandler | undefined;
  onCanPlayThrough?: NativeEventHandler | undefined;
  onDurationChange?: NativeEventHandler | undefined;
  onEmptied?: NativeEventHandler | undefined;
  onEncrypted?: NativeEventHandler | undefined;
  onEnded?: NativeEventHandler | undefined;
  onLoadedData?: NativeEventHandler | undefined;
  onLoadedMetadata?: NativeEventHandler | undefined;
  onLoadStart?: NativeEventHandler | undefined;
  onPause?: NativeEventHandler | undefined;
  onPlay?: NativeEventHandler | undefined;
  onPlaying?: NativeEventHandler | undefined;
  onProgress?: NativeEventHandler | undefined;
  onRateChange?: NativeEventHandler | undefined;
  onResize?: NativeEventHandler | undefined;
  onSeeked?: NativeEventHandler | undefined;
  onSeeking?: NativeEventHandler | undefined;
  onStalled?: NativeEventHandler | undefined;
  onSuspend?: NativeEventHandler | undefined;
  onTimeUpdate?: NativeEventHandler | undefined;
  onVolumeChange?: NativeEventHandler | undefined;
  onWaiting?: NativeEventHandler | undefined;

  // MouseEvents
  onAuxClick?: NativeMouseEventHandler | undefined;
  onAuxClickCapture?: NativeMouseEventHandler | undefined;
  onClick?: MouseEventHandler<T> | undefined;
  onClickCapture?: MouseEventHandler<T> | undefined;
  onContextMenu?: NativeMouseEventHandler | undefined;
  onContextMenuCapture?: NativeMouseEventHandler | undefined;
  onDoubleClick?: MouseEventHandler<T> | undefined;
  onDoubleClickCapture?: MouseEventHandler<T> | undefined;
  onDrag?: DragEventHandler | undefined;
  onDragCapture?: DragEventHandler | undefined;
  onDragEnd?: DragEventHandler | undefined;
  onDragEndCapture?: DragEventHandler | undefined;
  onDragEnter?: DragEventHandler | undefined;
  onDragEnterCapture?: DragEventHandler | undefined;
  onDragLeave?: DragEventHandler | undefined;
  onDragLeaveCapture?: DragEventHandler | undefined;
  onDragOver?: DragEventHandler | undefined;
  onDragOverCapture?: DragEventHandler | undefined;
  onDragStart?: DragEventHandler | undefined;
  onDragStartCapture?: DragEventHandler | undefined;
  onDrop?: DragEventHandler | undefined;
  onDropCapture?: DragEventHandler | undefined;
  onMouseDown?: MouseEventHandler<T> | undefined;
  onMouseDownCapture?: MouseEventHandler<T> | undefined;
  onMouseEnter?: NativeMouseEventHandler | undefined;
  onMouseLeave?: NativeMouseEventHandler | undefined;
  onMouseMove?: MouseEventHandler<T> | undefined;
  onMouseMoveCapture?: MouseEventHandler<T> | undefined;
  onMouseOut?: NativeMouseEventHandler | undefined;
  onMouseOutCapture?: NativeMouseEventHandler | undefined;
  onMouseOver?: NativeMouseEventHandler | undefined;
  onMouseOverCapture?: NativeMouseEventHandler | undefined;
  onMouseUp?: MouseEventHandler<T> | undefined;
  onMouseUpCapture?: MouseEventHandler<T> | undefined;

  // Selection Events
  onSelect?: NativeEventHandler | undefined;
  onSelectCapture?: NativeEventHandler | undefined;

  // Touch Events
  onTouchCancel?: NativeTouchEventHandler | undefined;
  onTouchCancelCapture?: NativeTouchEventHandler | undefined;
  onTouchEnd?: TouchEventHandler<T> | undefined;
  onTouchEndCapture?: TouchEventHandler<T> | undefined;
  onTouchMove?: TouchEventHandler<T> | undefined;
  onTouchMoveCapture?: TouchEventHandler<T> | undefined;
  onTouchStart?: TouchEventHandler<T> | undefined;
  onTouchStartCapture?: TouchEventHandler<T> | undefined;

  // Pointer Events
  onPointerDown?: PointerEventHandler<T> | undefined;
  onPointerDownCapture?: PointerEventHandler<T> | undefined;
  onPointerMove?: PointerEventHandler<T> | undefined;
  onPointerMoveCapture?: PointerEventHandler<T> | undefined;
  onPointerUp?: PointerEventHandler<T> | undefined;
  onPointerUpCapture?: PointerEventHandler<T> | undefined;
  onPointerCancel?: NativePointerEventHandler | undefined;
  onPointerCancelCapture?: NativePointerEventHandler | undefined;
  onPointerEnter?: NativePointerEventHandler | undefined;
  onPointerLeave?: NativePointerEventHandler | undefined;
  onPointerOver?: NativePointerEventHandler | undefined;
  onPointerOverCapture?: NativePointerEventHandler | undefined;
  onPointerOut?: NativePointerEventHandler | undefined;
  onPointerOutCapture?: NativePointerEventHandler | undefined;
  onGotPointerCapture?: NativePointerEventHandler | undefined;
  onLostPointerCapture?: NativePointerEventHandler | undefined;

  // UI Events
  onScroll?: UIEventHandler | undefined;

  // Wheel Events
  onWheel?: WheelEventHandler | undefined;

  // Animation Events
  onAnimationStart?: AnimationEventHandler | undefined;
  onAnimationStartCapture?: AnimationEventHandler | undefined;
  onAnimationEnd?: AnimationEventHandler | undefined;
  onAnimationEndCapture?: AnimationEventHandler | undefined;
  onAnimationIteration?: AnimationEventHandler | undefined;
  onAnimationIterationCapture?: AnimationEventHandler | undefined;

  // Toggle Events
  onToggle?: ToggleEventHandler | undefined;

  // Transition Events
  onTransitionCancel?: TransitionEventHandler | undefined;
  onTransitionCancelCapture?: TransitionEventHandler | undefined;
  onTransitionEnd?: TransitionEventHandler | undefined;
  onTransitionEndCapture?: TransitionEventHandler | undefined;
  onTransitionRun?: TransitionEventHandler | undefined;
  onTransitionRunCapture?: TransitionEventHandler | undefined;
  onTransitionStart?: TransitionEventHandler | undefined;
  onTransitionStartCapture?: TransitionEventHandler | undefined;
}
