# Vite Vanilla Example

This project demonstrates how to use `vite-plugin-java` to set up a vanilla Vite project.

For more detailed information, please refer to [vite-jsp-demo]. In [vite-jsp-demo], we build a simple functional JSP web application using `Vite` with the `vite-plugin-java` plugin and the `vite-spring-webmvc` Maven package.

## Quick Start

### Prerequisites

- pnpm@9.1.4 or higher

### Installation

First, build `vite-plugin-java`:

```sh
# Install all dependencies recursively
pnpm install --frozen-lockfile -r

cd packages/vite-plugin-java
pnpm build
```

Next, run the development server:

```sh
cd examples/vanilla
pnpm dev
```

You should see the development server running:

```sh
  VITE v5.2.12  ready in 1058 ms

  ➜  Local:   http://localhost:5173/
  ➜  press h + enter to show help

  JAVA 11  plugin v0.0.0

  ➜  APP_URL: http://localhost:8080
```

The development server runs at [http://localhost:5173](http://localhost:5173). The console displays your Java version from the `pom.xml` or `build.gradle` file if provided, and the plugin reads your `*.properties` file to get your `app.url`. Alternatively, you can set `APP_URL` in the `.env` file.

[vite-jsp-demo]: https://github.com/benny123tw/vite-jsp-demo
