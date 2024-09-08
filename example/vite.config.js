import { defineConfig } from 'vite';

export default defineConfig({
  esbuild: {
    jsxFactory: 'SimpReact.createElement',
    jsxFragment: 'SimpReact.Fragment',
  },
});
