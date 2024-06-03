import process from 'node:process'
import fs from 'node:fs'
import type { Buffer } from 'node:buffer'
import type { AddressInfo } from 'node:net'
import path from 'node:path'
import type { ConfigEnv, Plugin, ResolvedConfig, UserConfig } from 'vite'
import { loadEnv } from 'vite'
import { merge } from 'smob'
import colors from 'picocolors'
import swc from '@rollup/plugin-swc'
import { PLUGIN_NAME, createDebugger, dirname, isGradleProject, isIpv6, isMavenProject } from './utils'
import type { DevServerUrl, VitePluginJavaConfig } from '.'

const debug = createDebugger(`${PLUGIN_NAME}`)

let exitHandlersBound = false

interface JavaPlugin extends Plugin {
  config: (config: UserConfig, env: ConfigEnv) => UserConfig
}

/**
 * Java plugin for Vite.
 *
 * @param config - A config object or relative path(s) of the scripts to be compiled.
 */
export function java(config: string | string[] | VitePluginJavaConfig): [JavaPlugin, ...Plugin[]] {
  debug?.(`${PLUGIN_NAME} plugin initialized.`)
  debug?.('config, %O', config)
  const pluginConfig = resolvePluginConfig(config)
  debug?.('resolved config, %O', pluginConfig)

  return resolveJavaPlugin(pluginConfig)
}

/**
 * Resolve the Java plugin configuration.
 */
function resolveJavaPlugin(pluginConfig: Required<VitePluginJavaConfig>): [JavaPlugin, ...Plugin[]] {
  debug?.('start resolving plugins.')
  let viteDevServerUrl: DevServerUrl
  let resolvedConfig: ResolvedConfig
  let userConfig: UserConfig

  const defaultAliases: Record<string, string> = {
    '@': '/src',
  }
  const plugins: [JavaPlugin, ...Plugin[]] = [
    {
      name: PLUGIN_NAME,
      enforce: 'post',
      config: (config, { command, mode }) => {
        debug?.('configuring plugin, command: %s, mode: %s', command, mode)
        userConfig = config
        const env = loadEnv(mode, config.envDir || process.cwd(), '')
        const assetUrl = env.ASSET_URL ?? '/'
        const serverConfig = command === 'serve'
          ? resolveEnvironmentServerConfig(env)
          : undefined

        return {
          base: userConfig.base ?? (command === 'build' ? resolveBase(pluginConfig, assetUrl) : ''),
          publicDir: userConfig.publicDir ?? pluginConfig.publicDirectory ?? false,
          build: {
            manifest: userConfig.build?.manifest ?? '.vite/manifest.json',
            outDir: userConfig.build?.outDir ?? pluginConfig.outputDirectory,
            rollupOptions: {
              input: userConfig.build?.rollupOptions?.input ?? pluginConfig.input,
            },
            // default to 0 to disable inlining
            assetsInlineLimit: userConfig?.build?.assetsInlineLimit ?? 0,
          },
          server: {
            origin: userConfig.server?.origin ?? '__java_vite_placeholder__',
            host: userConfig.server?.host ?? 'localhost',
            port: userConfig.server?.port ?? (env.VITE_PORT ? Number.parseInt(env.VITE_PORT) : 5173),
            strictPort: userConfig.server?.strictPort ?? true,
            ...(serverConfig
              ? {
                  host: userConfig.server?.host ?? serverConfig.host,
                  hmr: userConfig.server?.hmr === false
                    ? false
                    : {
                        ...serverConfig.hmr,
                        ...(userConfig.server?.hmr === true ? {} : userConfig.server?.hmr),
                      },
                  https: userConfig.server?.https ?? serverConfig.https,
                }
              : undefined),
          },
          resolve: {
            alias: Array.isArray(userConfig.resolve?.alias)
              ? [
                  ...userConfig.resolve?.alias ?? [],
                  ...Object.keys(defaultAliases).map(alias => ({
                    find: alias,
                    replacement: defaultAliases[alias],
                  })),
                ]
              : merge(defaultAliases, userConfig.resolve?.alias ?? {}),
          },
          optimizeDeps: {
            exclude: [
              '@swc/core',
            ],
          },
          esbuild: pluginConfig.tsCompiler === 'swc' ? false : userConfig.esbuild,
        }
      },
      configResolved(config) {
        resolvedConfig = config
        debug?.('config resolved.')
      },
      transform(code) {
        if (resolvedConfig.command === 'serve') {
          debug?.('transforming code for serve.')
          code = code.replace(/__java_vite_placeholder__/g, viteDevServerUrl)

          return pluginConfig.transformOnServe(code, viteDevServerUrl)
        }
      },
      configureServer(server) {
        const envDir = resolvedConfig.envDir || process.cwd()
        const appUrl = loadEnv(resolvedConfig.mode, envDir, 'APP_URL').APP_URL ?? 'undefined'

        server.httpServer?.once('listening', () => {
          debug?.('server listening.')
          const address = server.httpServer?.address()

          const isAddressInfo = (x: string | AddressInfo | null | undefined): x is AddressInfo => typeof x === 'object'
          if (isAddressInfo(address)) {
            viteDevServerUrl = userConfig.server?.origin ? userConfig.server.origin as DevServerUrl : resolveDevServerUrl(address, server.config)

            fs.writeFileSync(pluginConfig.hotFile, `${viteDevServerUrl}${server.config.base.replace(/\/$/, '')}`)

            setTimeout(() => {
              server.config.logger.info(`\n  ${colors.red(`${colors.bold('JAVA')} ${javaVersion()}`)}  ${colors.dim('plugin')} ${colors.bold(`v${pluginVersion()}`)}`)
              server.config.logger.info('')
              server.config.logger.info(`  ${colors.green('➜')}  ${colors.bold('APP_URL')}: ${colors.cyan(appUrl.replace(/:(\d+)/, (_, port) => `:${colors.bold(port)}`))}`)
            }, 100)
          }
        })

        if (!exitHandlersBound) {
          const clean = () => {
            debug?.('cleaning up hot file.')
            if (fs.existsSync(pluginConfig.hotFile)) {
              fs.rmSync(pluginConfig.hotFile)
            }
          }

          process.on('exit', clean)
          process.on('SIGINT', () => process.exit())
          process.on('SIGTERM', () => process.exit())
          process.on('SIGHUP', () => process.exit())

          exitHandlersBound = true
        }

        return () => server.middlewares.use((req, res, next) => {
          if (req.url === '/index.html') {
            res.statusCode = 404

            res.end(
              fs.readFileSync(path.join(dirname(), 'dev-server-index.html')).toString().replace(/\{\{ APP_URL \}\}/g, appUrl),
            )
          }

          next()
        })
      },
    },
  ]

  if (pluginConfig.tsCompiler === 'swc') {
    debug?.('adding SWC plugin.')

    plugins.push(swc(pluginConfig.swcOptions))
  }

  debug?.('plugins resolved.')
  return plugins
}

/**
 * The version of Java being run.
 */
function javaVersion(): string {
  try {
    let version: string | undefined

    if (isMavenProject()) {
      const pom = fs.readFileSync('pom.xml').toString()
      version = pom.match(/<java.version>(.*)<\/java.version>/)?.[1]
    }

    if (isGradleProject()) {
      const gradle = fs.readFileSync('build.gradle').toString()
      version = gradle.match(/sourceCompatibility = '(.*)'/)?.[1]
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
function pluginVersion(): string {
  try {
    return JSON.parse(fs.readFileSync(path.join(dirname(), '../package.json')).toString())?.version
  }
  catch {
    return ''
  }
}

function resolvePluginConfig(config: string | string[] | VitePluginJavaConfig): Required<VitePluginJavaConfig> {
  if (typeof config === 'undefined') {
    throw new PluginError(`missing configuration.`)
  }

  if (typeof config === 'string' || Array.isArray(config)) {
    config = { input: config }
  }

  if (typeof config.input === 'undefined') {
    throw new PluginError(`missing configuration for "input".`)
  }

  if (typeof config.publicDirectory === 'string') {
    config.publicDirectory = config.publicDirectory.trim().replace(/^\/+/, '')

    if (config.publicDirectory === '') {
      throw new PluginError(`"publicDirectory" must be a subdirectory. E.g. \'public\'.`)
    }
  }

  if (typeof config.buildDirectory === 'string') {
    config.buildDirectory = config.buildDirectory.trim().replace(/\/+$/, '')

    if (config.buildDirectory === '') {
      throw new PluginError(`"buildDirectory" must be a subdirectory. E.g. \'build\'.`)
    }
  }

  if (typeof config.outputDirectory === 'string') {
    config.outputDirectory = config.outputDirectory.trim().replace(/\/+$/, '')
  }

  return {
    input: config.input,
    buildDirectory: config.buildDirectory ?? 'build',
    publicDirectory: config.publicDirectory ?? 'public',
    outputDirectory: config.outputDirectory ?? 'dist',
    tsCompiler: config.tsCompiler ?? 'esbuild',
    swcOptions: config.swcOptions ?? {},
    hotFile: config.hotFile ?? path.join((config.publicDirectory ?? 'public'), 'hot'),
    transformOnServe: config.transformOnServe ?? (code => code),
  }
}

/**
 * Resolve the Vite base option from the configuration.
 */
function resolveBase(config: Required<VitePluginJavaConfig>, assetUrl: string): string {
  return `${assetUrl + (!assetUrl.endsWith('/') ? '/' : '') + config.buildDirectory}/`
}

class PluginError extends Error {
  constructor(message: string) {
    super(`${PLUGIN_NAME}: ${message}`)
  }
}

/**
 * Resolve the server config from the environment.
 */
function resolveEnvironmentServerConfig(env: Record<string, string>): {
  hmr?: { host: string }
  host?: string
  https?: { cert: Buffer, key: Buffer }
} | undefined {
  if (!env.VITE_DEV_SERVER_KEY && !env.VITE_DEV_SERVER_CERT) {
    return
  }

  if (!fs.existsSync(env.VITE_DEV_SERVER_KEY) || !fs.existsSync(env.VITE_DEV_SERVER_CERT)) {
    throw new Error(`Unable to find the certificate files specified in your environment. Ensure you have correctly configured VITE_DEV_SERVER_KEY: [${env.VITE_DEV_SERVER_KEY}] and VITE_DEV_SERVER_CERT: [${env.VITE_DEV_SERVER_CERT}].`)
  }

  const host = resolveHostFromEnv(env)

  if (!host) {
    throw new Error(`Unable to determine the host from the environment's APP_URL: [${env.APP_URL}].`)
  }

  return {
    hmr: { host },
    host,
    https: {
      key: fs.readFileSync(env.VITE_DEV_SERVER_KEY),
      cert: fs.readFileSync(env.VITE_DEV_SERVER_CERT),
    },
  }
}

/**
 * Resolve the host name from the environment.
 */
function resolveHostFromEnv(env: Record<string, string>): string | undefined {
  try {
    return new URL(env.APP_URL).host
  }
  catch {

  }
}

/**
 * Resolve the dev server URL from the server address and configuration.
 */
function resolveDevServerUrl(address: AddressInfo, config: ResolvedConfig): DevServerUrl {
  const configHmrProtocol = typeof config.server.hmr === 'object' ? config.server.hmr.protocol : null
  const clientProtocol = configHmrProtocol ? (configHmrProtocol === 'wss' ? 'https' : 'http') : null
  const serverProtocol = config.server.https ? 'https' : 'http'
  const protocol = clientProtocol ?? serverProtocol

  const configHmrHost = typeof config.server.hmr === 'object' ? config.server.hmr.host : null
  const configHost = typeof config.server.host === 'string' ? config.server.host : null
  const serverAddress = isIpv6(address) ? `[${address.address}]` : address.address
  const host = configHmrHost ?? configHost ?? serverAddress

  const configHmrClientPort = typeof config.server.hmr === 'object' ? config.server.hmr.clientPort : null
  const port = configHmrClientPort ?? address.port

  return `${protocol}://${host}:${port}`
}
