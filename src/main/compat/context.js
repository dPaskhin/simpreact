import { createCreateContext, createUseContext } from '@simpreact/context';
import { renderRuntime } from './renderRuntime.js';

export const createContext = createCreateContext(renderRuntime);
export const useContext = createUseContext(renderRuntime);

export default {
  createContext,
  useContext,
};
