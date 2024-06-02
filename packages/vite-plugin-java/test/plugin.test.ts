import java, { PLUGIN_NAME } from 'src'
import { afterEach, describe, expect, it } from 'vitest'

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
})
