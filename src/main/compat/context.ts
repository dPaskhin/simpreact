import * as SimpReactContext from '@simpreact/context';
import { renderRuntime } from './renderRuntime.js';

export const createContext = SimpReactContext.createCreateContext(renderRuntime);
export const useContext = SimpReactContext.useContext;

export default {
  createContext,
  useContext,
};
