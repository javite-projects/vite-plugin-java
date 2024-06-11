import { defineConfig } from 'vite'
import java, { createRollupInputConfig } from 'vite-plugin-java'

export default defineConfig({
  server: {
    open: true,
  },
  build: {
    // since output directory is not inside project root and will not be emptied, use --emptyOutDir to override
    emptyOutDir: true,
  },
  plugins: [java({
    outputDirectory: '../server/src/main/webapp/WEB-INF/dist',
    javaProjectBase: '../server',
    input: createRollupInputConfig(),
  })],
})
