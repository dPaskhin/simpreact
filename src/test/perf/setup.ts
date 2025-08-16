import { JSDOM } from 'jsdom';

const { window } = new JSDOM(`<!DOCTYPE html>`);

(globalThis as any).window = window;
(globalThis as any).document = window.document;
(globalThis as any).Node = window.Node;
