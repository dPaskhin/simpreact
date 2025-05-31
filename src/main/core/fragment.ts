import type { SimpNode } from './createElement';
import { EMPTY_OBJECT } from '../shared';

export type Fragment = (props: { children?: SimpNode }) => SimpNode;

export const Fragment = EMPTY_OBJECT as unknown as Fragment;
