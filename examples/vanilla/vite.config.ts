import { defineConfig } from 'vite'
import java, { createRollupInputConfig } from 'vite-plugin-java'

export default defineConfig({
  server: {
    open: true,
  },
  plugins: [java({
    input: createRollupInputConfig(),
  })],
})
