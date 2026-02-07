import * as SimpReactContext from '@simpreact/context';
import { renderRuntime } from './renderRuntime.js';

export const createContext = SimpReactContext.createCreateContext(renderRuntime);
export const useContext = SimpReactContext.createUseContext(renderRuntime);

export default {
  createContext,
  useContext,
};
