import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default {
  input: 'src/index.js',
  output: {
    file: 'dist/customize.js',
    format: 'iife',
    name: 'kintoneCustomize',
    sourcemap: true
  },
  plugins: [resolve(), commonjs()]
};
