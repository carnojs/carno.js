---
sidebar_position: 2
---

# CLI

The Carno.js CLI provides essential tools for managing your application, including database migrations and route inspection.

## Installation

The CLI is distributed as a separate package. You can install it as a development dependency.

### Using Bun (Recommended)

```bash
bun add -d @carno.js/cli
```

### Using npm

```bash
npm install -D @carno.js/cli
```

## Usage

Once installed, you can run the CLI using `bunx` or `npx`.

```bash
bunx carno --help
```

### Common Commands

#### Routes

To list all registered routes in your application:

```bash
# Analyze carno.config.ts and list routes
bunx carno routes

# Or point to your entry file if config is not enough
bunx carno routes src/index.ts
```

For more details on routing, see the [Controllers & Routing](./core/controllers.md) documentation.

#### Migrations

To manage database migrations (generate, run, revert):

```bash
# Generate a new migration based on entity changes
bunx carno migration:generate

# Apply pending migrations
bunx carno migration:run
```

For a comprehensive guide on migrations, refer to the [Migrations](./orm/migrations.md) documentation.
