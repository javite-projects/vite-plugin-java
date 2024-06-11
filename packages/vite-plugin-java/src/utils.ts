import process from 'node:process'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { AddressInfo } from 'node:net'
import debug from 'debug'
import type { GlobOptions } from 'glob'
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
export function isMavenProject(projectRoot: string = ''): boolean {
  return fs.existsSync(path.join(projectRoot || process.cwd(), 'pom.xml'))
}

/**
 * Checks if the current project is a Gradle project.
 *
 * @returns True if the current project is a Gradle project, false otherwise.
 */
export function isGradleProject(projectRoot: string = ''): boolean {
  return fs.existsSync(path.join(projectRoot || process.cwd(), 'build.gradle'))
}

/**
 * Checks if the current project is a Kotlin DSL project.
 * @returns True if the current project is a Kotlin DSL project, false otherwise.
 */
export function isKotlinDSLProject(projectRoot: string = ''): boolean {
  return fs.existsSync(path.join(projectRoot || process.cwd(), 'build.gradle.kts'))
}

/**
 * Reads the properties from the project files.
 *
 * @returns A map containing the key-value pairs of the properties.
 */
export function readPropertiesFile(pattern?: string | string[], options?: GlobOptions): Map<string, string> {
  const properties: Map<string, string> = new Map()
  const _pattern = pattern || '**/*.properties'
  const _options = merge({}, options || {}, { cwd: process.cwd() })

  globSync(_pattern, _options).forEach((file) => {
    const _file = typeof file === 'string' ? file : file.path
    const content = fs.readFileSync(_file, 'utf-8')
    content.split('\n').filter(c => !c?.trim().startsWith('#')).forEach((line) => {
      const [key, value] = line.split('=')
      if (key)
        properties.set(key?.trim(), value?.trim())
    })
  })

  return properties
}

/**
 * The version of Java being run.
 *
 * @param projectRoot - The root directory of the Java project.
 */
export function javaVersion(projectRoot: string = '.'): string {
  try {
    let version: string | undefined

    if (isMavenProject(projectRoot)) {
      const pom = fs.readFileSync(path.join(projectRoot, 'pom.xml')).toString()
      version = pom.match(/<java.version>(.*)<\/java.version>/)?.[1]
    }

    if (isGradleProject(projectRoot)) {
      const gradle = fs.readFileSync(path.join(projectRoot, 'build.gradle')).toString()
      version = gradle.match(/sourceCompatibility\s*=\s*['"]?(\d+(\.\d+)?)['"]?/i)?.[1]

      if (!version) {
        version = gradle.match(/sourceCompatibility\s*=\s*JavaVersion\.VERSION_(\d+(_\d+)?)/i)?.[1]?.replace('_', '.')
      }
    }

    if (isKotlinDSLProject(projectRoot)) {
      const gradleKts = fs.readFileSync(path.join(projectRoot, 'build.gradle.kts')).toString()
      version = gradleKts.match(/sourceCompatibility\s*=\s*JavaVersion\.VERSION_(\d+(_\d+)?)/i)?.[1]?.replace('_', '.')

      if (!version) {
        version = gradleKts.match(/java\.sourceCompatibility\s*=\s*JavaVersion\.VERSION_(\d+(_\d+)?)/i)?.[1]?.replace('_', '.')
      }
    }

    return version || ''
  }
  catch {
    return ''
  }
}

/**
 * The version of the Vite plugin Java being run.
 */
export function pluginVersion(): string {
  try {
    return JSON.parse(fs.readFileSync(path.join(dirname(), '../package.json')).toString())?.version
  }
  catch {
    return ''
  }
}
