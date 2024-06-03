import process from 'node:process'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { AddressInfo } from 'node:net'
import debug from 'debug'
import { globSync } from 'glob'
import 'dotenv/config'
import { merge } from 'smob'

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
 * Creates the Rollup input configuration object.
 *
 * @param pattern - The glob pattern to match the entry files.
 * @param baseDir - The base directory for the entry files.
 * @param options - Additional options for the glob pattern matching.
 * @returns The Rollup input configuration object.
 */
export function createRollupInputConfig(
  pattern: string | string[] = 'src/**/main.ts',
  baseDir = 'src',
  options: Parameters<typeof globSync>[1] = {},
): { [entryAlias: string]: string } {
  const cwd = process.cwd()
  const globOptions = merge(options, { cwd })

  return Object.fromEntries(
    globSync(pattern, globOptions).map((file) => {
      const filepath: string = typeof file === 'string' ? file : file.path
      const absolutePath = path.resolve(cwd, filepath)

      return [
        path.relative(baseDir, filepath.slice(0, filepath.length - path.extname(filepath).length)),
        absolutePath,
      ]
    }),
  )
}

/**
 * Checks if the given address is an IPv6 address.
 *
 * @param address - The address to check.
 * @returns True if the address is an IPv6 address, false otherwise.
 */
export function isIpv6(address: AddressInfo): boolean {
  return address.family === 'IPv6'
    // In node >=18.0 <18.4 this was an integer value. This was changed in a minor version.
    // See: https://github.com/laravel/vite-plugin/issues/103
    // @ts-expect-error-next-line
    || address.family === 6
}

/**
 * Returns the directory of the current file.
 *
 * @returns The directory of the current file.
 */
export function dirname(): string {
  return fileURLToPath(new URL('.', import.meta.url))
}

/**
 * Checks if the current project is a Maven project.
 *
 * @returns True if the current project is a Maven project, false otherwise.
 */
export function isMavenProject(): boolean {
  return fs.existsSync(path.join(process.cwd(), 'pom.xml'))
}

/**
 * Checks if the current project is a Gradle project.
 *
 * @returns True if the current project is a Gradle project, false otherwise.
 */
export function isGradleProject(): boolean {
  return fs.existsSync(path.join(process.cwd(), 'build.gradle'))
}
