import { afterEach, describe, expect, it } from 'vitest'
import java, { PLUGIN_NAME } from '../src/index'

describe('vite-plugin-java', () => {
  afterEach(() => {})

  it('handles missing configuration', () => {
    // eslint-disable-next-line ts/ban-ts-comment
    // @ts-expect-error
    expect(() => java())
      .toThrowError(`${PLUGIN_NAME}: missing configuration.`)

    // eslint-disable-next-line ts/ban-ts-comment
    // @ts-expect-error
    expect(() => java({}))
      .toThrowError(`${PLUGIN_NAME}: missing configuration for "input".`)
  })

  it('accepts a single input', () => {
    const plugin = java('resources/js/app.ts')[0]

    const config = plugin.config({}, { command: 'build', mode: 'production' })
    expect(config.build?.rollupOptions?.input).toBe('resources/js/app.ts')
  })

  it('accepts an array of inputs', () => {
    const plugin = java([
      'resources/js/app.ts',
      'resources/js/other.js',
    ])[0]

    const config = plugin.config({}, { command: 'build', mode: 'production' })
    expect(config.build?.rollupOptions?.input).toEqual(['resources/js/app.ts', 'resources/js/other.js'])
  })

  it('accepts a Rollup input configuration', () => {
    const plugin = java({
      input: {
        app: 'resources/js/app.ts',
        other: 'resources/js/other.js',
      },
    })[0]

    const config = plugin.config({}, { command: 'build', mode: 'production' })
    expect(config.build?.rollupOptions?.input).toEqual({
      app: 'resources/js/app.ts',
      other: 'resources/js/other.js',
    })
  })

  it('accepts a full configuration', () => {
    const plugin = java({
      input: 'resources/js/app.ts',
      publicDirectory: 'other-public',
      buildDirectory: 'other-build',
      outputDirectory: 'other-output',
    })[0]

    const config = plugin.config({}, { command: 'build', mode: 'production' })
    expect(config.base).toBe('/other-build/')
    expect(config.build?.manifest).toBe('manifest.json')
    expect(config.build?.outDir).toBe('other-output')
    expect(config.build?.rollupOptions?.input).toBe('resources/js/app.ts')
  })

  it('respects the users build.manifest config option', () => {
    const plugin = java({
      input: 'resources/js/app.js',
    })[0]

    const userConfig = { build: { manifest: 'my-custom-manifest.json' } }

    const config = plugin.config(userConfig, { command: 'build', mode: 'production' })

    expect(config.build?.manifest).toBe('my-custom-manifest.json')
  })

  it('has a default manifest path', () => {
    const plugin = java({
      input: 'resources/js/app.js',
    })[0]

    const userConfig = {}

    const config = plugin.config(userConfig, { command: 'build', mode: 'production' })

    expect(config.build?.manifest).toBe('.vite/manifest.json')
  })

  it('respects users base config option', () => {
    const plugin = java({
      input: 'resources/js/app.ts',
    })[0]

    const userConfig = { base: '/foo/' }

    const config = plugin.config(userConfig, { command: 'build', mode: 'production' })

    expect(config.base).toBe('/foo/')
  })
})
