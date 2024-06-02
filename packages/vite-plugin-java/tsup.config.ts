import { defineConfig } from 'tsup'

export default defineConfig({
  clean: true,
  entry: ['src/index.ts'],
  shims: true,
  banner: ({ format }) => {
    if (format === 'esm') {
      return {
        js: 'import {createRequire as __createRequire} from \'module\';var require=__createRequire(import.meta.url);',
      }
    }
  },
})
