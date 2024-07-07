import { java } from './vite-plugin-java'

export interface VitePluginJavaConfig {
  /**
   * The path or paths of the entry points to compile.
   */
  input: string | string[] | { [entryAlias: string]: string }

  /**
   * The directory for public assets.
   *
   * @default 'public'
   */
  publicDirectory?: string

  /**
   * The public subdirectory where compiled assets should be written.
   *
   * @default 'build'
   */
  buildDirectory?: string

  /**
   * The directory where the bundle should be written.
   *
   * @default 'dist'
   */
  outputDirectory?: string

  /**
   * The path to the Java project root.
   */
  javaProjectBase?: string

  /**
   * Transform the code while serving.
   */
  transformOnServe?: (code: string, url: DevServerUrl) => string
}

export type DevServerUrl = `${'http' | 'https'}://${string}:${number}`

export { PLUGIN_NAME, createRollupInputConfig, readPropertiesFile } from './utils'
export { java }
export default java
