import type { Maybe } from '../types';
import type { DiffTask as _DiffTask, SimpElement as _SimpElement } from '../internal';

export type DomNode = Element | Text;

export interface SimpElement<P = any> extends _SimpElement<P, void, DomNode> {}

export interface DiffTask extends _DiffTask<Maybe<SimpElement>, Maybe<SimpElement>> {}

export type Attrs = Record<string, unknown>;
