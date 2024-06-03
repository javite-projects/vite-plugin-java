import process from 'node:process'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { AddressInfo } from 'node:net'
import debug from 'debug'
import { globSync } from 'glob'
import 'dotenv/config'

export const PLUGIN_NAME = 'vite-plugin-java'
const filter = process.env.VITE_DEBUG_FILTER

/**
 * Creates a debugger function for the specified namespace.
 *
 * @param namespace - The namespace for the debugger.
 * @returns The debugger function or undefined if debugging is disabled.
 */
export function createDebugger(
  namespace: string,
): debug.Debugger['log'] | undefined {
  const log = debug(namespace)
  const enabled = log.enabled

  if (enabled) {
    return (...args: [string, ...any[]]) => {
      if (!filter || args.some(a => a?.includes?.(filter))) {
        log(...args)
      }
    }
  }
}

/**
 * Creates a Rollup input configuration object based on the specified pattern and base directory.
 *
 * @param pattern - The file pattern to match for input files. Defaults to src/~/main.ts
 * @param baseDir - The base directory for the input files. Defaults to 'src'.
 * @returns The Rollup input configuration object.
 */
export function createRollupInputConfig(
  pattern: string | string[] = 'src/**/main.ts',
  baseDir = 'src',
): { [entryAlias: string]: string } {
  return Object.fromEntries(
    globSync(pattern).map((file) => {
      return [
        path.relative(baseDir, path.basename(file, path.extname(file))),
        fileURLToPath(new URL(file, import.meta.url)),
      ]
    }),
  )
}

export function isIpv6(address: AddressInfo): boolean {
  return address.family === 'IPv6'
  // In node >=18.0 <18.4 this was an integer value. This was changed in a minor version.
  // See: https://github.com/laravel/vite-plugin/issues/103
  // @ts-expect-error-next-line
    || address.family === 6
}

/**
 * The directory of the current file.
 */
export function dirname(): string {
  return fileURLToPath(new URL('.', import.meta.url))
}

export function isMavenProject(): boolean {
  return fs.existsSync(path.join(process.cwd(), 'pom.xml'))
}

export function isGradleProject(): boolean {
  return fs.existsSync(path.join(process.cwd(), 'build.gradle'))
}
