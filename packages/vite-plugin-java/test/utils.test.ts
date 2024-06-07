import fs from 'node:fs'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createRollupInputConfig, readPropertiesFile } from '../src/utils'

const files = [
  'src/main.ts',
  'src/other.ts',
  'src/another.ts',
  'src/nested/main.ts',
  'src/nested/other.ts',
]

function getAbsolutePath(filepath: string) {
  return path.normalize(path.resolve(process.cwd(), filepath))
}

describe('vite-plugin-java - utils', () => {
  beforeAll(() => {
    for (const file of files) {
      const filePath = path.join('fixtures', file)
      fs.mkdirSync(path.dirname(filePath), { recursive: true })
      fs.writeFileSync(filePath, '/** I love Java! **/')
    }
  })

  afterAll(() => {
    fs.rmSync('fixtures', { recursive: true, force: true })
  })

  it('should find all the entry files', () => {
    const inputs = createRollupInputConfig('fixtures/src/**/*.ts', 'fixtures/src')

    expect(inputs).toEqual({
      main: getAbsolutePath('fixtures/src/main.ts'),
      other: getAbsolutePath('fixtures/src/other.ts'),
      another: getAbsolutePath('fixtures/src/another.ts'),
      [path.normalize('nested/main')]: getAbsolutePath('fixtures/src/nested/main.ts'),
      [path.normalize('nested/other')]: getAbsolutePath('fixtures/src/nested/other.ts'),
    })
  })

  it('should find all the entry files with cwd setup', () => {
    const inputs = createRollupInputConfig('src/**/main.ts', 'src', { cwd: 'fixtures' })

    expect(inputs).toEqual({
      main: getAbsolutePath('src/main.ts'),
      [path.normalize('nested/main')]: getAbsolutePath('src/nested/main.ts'),
    })
  })

  it('should read properties and return mapped entries', () => {
    const expectedProperties = new Map(
      [
        ['app.url', 'http://localhost:8080'],
        ['app.name', 'Vite Java App'],
      ],
    )
    let content = ''

    for (const [key, value] of expectedProperties.entries()) {
      content += `${key}=${value}\n`
    }
    fs.writeFileSync('fixtures/application.properties', content)

    const propertiesMap = readPropertiesFile()
    expect(propertiesMap).toEqual(expectedProperties)
  })
})
