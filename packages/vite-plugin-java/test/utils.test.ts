import fs from 'node:fs'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createRollupInputConfig, javaVersion, readPropertiesFile } from '../src/utils'

const files = [
  'src/main.ts',
  'src/other.ts',
  'src/another.ts',
  'src/nested/main.ts',
  'src/nested/other.ts',
]
const TEMP_FIXTURES_FOLDER = '__fixtures__'

function getAbsolutePath(filepath: string) {
  return path.normalize(path.resolve(process.cwd(), filepath))
}

describe('vite-plugin-java - utils', () => {
  beforeAll(() => {
    for (const file of files) {
      const filePath = path.join(TEMP_FIXTURES_FOLDER, file)
      fs.mkdirSync(path.dirname(filePath), { recursive: true })
      fs.writeFileSync(filePath, '/** I love Java! **/')
    }
  })

  afterAll(() => {
    fs.rmSync(TEMP_FIXTURES_FOLDER, { recursive: true, force: true })
  })

  it('should find all the entry files', () => {
    const inputs = createRollupInputConfig(`${TEMP_FIXTURES_FOLDER}/src/**/*.ts`, `${TEMP_FIXTURES_FOLDER}/src`)

    expect(inputs).toEqual({
      main: getAbsolutePath(`${TEMP_FIXTURES_FOLDER}/src/main.ts`),
      other: getAbsolutePath(`${TEMP_FIXTURES_FOLDER}/src/other.ts`),
      another: getAbsolutePath(`${TEMP_FIXTURES_FOLDER}/src/another.ts`),
      [path.normalize('nested/main')]: getAbsolutePath(`${TEMP_FIXTURES_FOLDER}/src/nested/main.ts`),
      [path.normalize('nested/other')]: getAbsolutePath(`${TEMP_FIXTURES_FOLDER}/src/nested/other.ts`),
    })
  })

  it('should find all the entry files with cwd setup', () => {
    const inputs = createRollupInputConfig('src/**/main.ts', 'src', { cwd: TEMP_FIXTURES_FOLDER })

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
    fs.writeFileSync(`${TEMP_FIXTURES_FOLDER}/application.properties`, content)

    const propertiesMap = readPropertiesFile()
    expect(propertiesMap).toEqual(expectedProperties)
  })

  it('should read the Java version from a Maven project', () => {
    // set up as a Maven project
    fs.copyFileSync(path.resolve(__dirname, 'fixtures/pom.xml'), `${TEMP_FIXTURES_FOLDER}/pom.xml`)

    const expectedVersion = '11'
    const version = javaVersion(TEMP_FIXTURES_FOLDER)
    expect(version).toBe(expectedVersion)

    fs.rmSync(`${TEMP_FIXTURES_FOLDER}/pom.xml`)
  })

  it('should read the Java version from a Gradle project', () => {
    // set up as a Gradle project
    fs.copyFileSync(path.resolve(__dirname, 'fixtures/build.gradle'), `${TEMP_FIXTURES_FOLDER}/build.gradle`)

    const expectedVersion = '1.8'
    const version = javaVersion(TEMP_FIXTURES_FOLDER)
    expect(version).toBe(expectedVersion)

    fs.rmSync(`${TEMP_FIXTURES_FOLDER}/build.gradle`)
  })

  it('should read the Java version from a Kotlin DSL project', () => {
    // set up as a Kotlin DSL project
    fs.copyFileSync(path.resolve(__dirname, 'fixtures/build.gradle.kts'), `${TEMP_FIXTURES_FOLDER}/build.gradle.kts`)

    const expectedVersion = '21'
    const version = javaVersion(TEMP_FIXTURES_FOLDER)
    expect(version).toBe(expectedVersion)

    fs.rmSync(`${TEMP_FIXTURES_FOLDER}/build.gradle.kts`)
  })
})
