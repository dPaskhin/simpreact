const typescript = require('@rollup/plugin-typescript');

module.exports = {
  input: ['./src/main/dom/index.ts', './src/main/hooks/index.ts', './src/main/index.ts'],
  output: [{ format: 'es', entryFileNames: '[name].js', dir: './lib', preserveModules: true }],
  plugins: [typescript({ tsconfig: './tsconfig.build.json' })],
};
