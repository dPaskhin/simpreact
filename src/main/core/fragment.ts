import type { SimpNode } from './createElement';

export type Fragment = (props: { children?: SimpNode }) => SimpNode;

export const Fragment = Object.freeze(Object.create(null)) as unknown as Fragment;
