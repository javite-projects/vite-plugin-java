# Vite Plugin for Java (Spring MVC)

This is a Vite plugin for integrating Java (Spring MVC) projects with Vite. Inspired by the `laravel/vite-plugin`, it provides functionalities to handle assets, configuration, and development server setup tailored for Java projects.

## Features

- Supports multiple entry points
- Customizable public and build directories
- Configurable TypeScript compiler (esbuild or swc)
- Hot module replacement support
- Automatic configuration based on environment variables

## Installation

```bash
npm install --save-dev vite-plugin-java
```

## Usage

### Configuration

Create a `vite.config.js` file in your project's root directory:

```js
import { defineConfig } from 'vite'
import java from 'vite-plugin-java'

export default defineConfig({
  plugins: [
    java({
      input: 'src/main.ts',
      publicDirectory: 'public',
      buildDirectory: 'build',
      outputDirectory: 'dist',
      tsCompiler: 'esbuild',
      swcOptions: {
        jsc: {
          target: 'es2015'
        }
      },
      hotFile: 'public/hot',
      transformOnServe: (code, url) => code.replace('__PLACEHOLDER__', url)
    })
  ]
})
```

### Options

| Option             | Type                                          | Default         | Description                                                |
|--------------------|-----------------------------------------------|-----------------|------------------------------------------------------------|
| `input`            | `string` \| `string[]` \| `{ [entryAlias: string]: string }` | Required        | Entry points to compile                                    |
| `publicDirectory`  | `string`                                      | `'public'`      | Directory for public assets                                |
| `buildDirectory`   | `string`                                      | `'build'`       | Subdirectory where compiled assets should be written       |
| `outputDirectory`  | `string`                                      | `'dist'`        | Directory where the bundle should be written               |
| `tsCompiler`       | `'esbuild'` \| `'swc'`                        | `'esbuild'`     | TypeScript compiler to use                                 |
| `swcOptions`       | `SwcOptions`                                  | `{}`            | Options to pass to the SWC compiler                        |
| `hotFile`          | `string`                                      | `'public/hot'`  | Path to the "hot" file                                     |
| `transformOnServe` | `(code: string, url: DevServerUrl) => string` | `code => code`  | Transform the code while serving                           |

### Example

```typescript
import java from 'vite-plugin-java'

export default {
  plugins: [
    java({
      input: {
        main: 'src/main.ts',
        admin: 'src/admin.ts'
      },
      publicDirectory: 'static',
      buildDirectory: 'assets',
      outputDirectory: 'build',
      tsCompiler: 'swc',
      swcOptions: {
        jsc: {
          parser: {
            syntax: 'typescript',
            tsx: true
          },
          target: 'es2015'
        }
      },
      hotFile: 'static/hot',
      transformOnServe: (code, url) => code.replace('__VITE_URL__', url)
    })
  ]
}
```

## API

### `java(config: string | string[] | VitePluginJavaConfig): [JavaPlugin, ...Plugin[]]`

Initializes the Java plugin with the provided configuration.

### Types

#### `VitePluginJavaConfig`

```typescript
export interface VitePluginJavaConfig {
  input: string | string[] | { [entryAlias: string]: string }
  publicDirectory?: string
  buildDirectory?: string
  outputDirectory?: string
  tsCompiler?: SupportedTSCompiler
  swcOptions?: SwcOptions
  hotFile?: string
  transformOnServe?: (code: string, url: DevServerUrl) => string
}

export type SupportedTSCompiler = 'esbuild' | 'swc'
export type DevServerUrl = `${'http' | 'https'}://${string}:${number}`
```

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

This project is licensed under the MIT License.

## Acknowledgements

Inspired by [laravel/vite-plugin](https://github.com/laravel/vite-plugin).
