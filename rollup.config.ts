// See: https://rollupjs.org/introduction/

import commonjs from '@rollup/plugin-commonjs'
import nodeResolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'

const config = {
  input: 'src/index.ts',
  output: {
    esModule: true,
    file: 'dist/index.js',
    format: 'es',
    sourcemap: true
  },
  external: ['@actions/core'],
  plugins: [
    typescript(),
    nodeResolve({
      preferBuiltins: true,
      // Handle circular dependencies
      mainFields: ['module', 'main'],
      extensions: ['.js', '.ts']
    }),
    commonjs({
      // Handle circular dependencies
      ignoreDynamicRequires: true,
      requireReturnsDefault: 'auto'
    })
  ],
  onwarn(warning, warn) {
    // Ignore circular dependency warnings for @actions/core
    if (
      warning.code === 'CIRCULAR_DEPENDENCY' &&
      warning.message.includes('@actions/core')
    ) {
      return
    }
    warn(warning)
  }
}

export default config
