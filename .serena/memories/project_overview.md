# Cheetah.js Project Overview

## Purpose
Cheetah.js is a TypeScript-based Framework and ORM library for efficient database operations. 

## Tech Stack
- **Language**: TypeScript (^5.9.3)
- **Runtime**: Bun (for testing and running)
- **Package Manager**: Bun
- **Monorepo**: Lerna (^7.4.2)
- **Database**: PostgreSQL (used in tests)
- **Testing Framework**: Bun test

## Project Structure
- `packages/`: Monorepo workspace with multiple packages:
  - `core`: Core framework
  - `orm`: ORM package (main focus)
  - `queue`: Queue package
  - `schedule`: Scheduling package
  - `swagger`: API documentation

## ORM Package (`packages/orm/`)
- **Version**: 0.1.106
- **Type**: CommonJS
- **Main dependencies**:
  - reflect-metadata (decorators)
  - ts-morph (TypeScript transformation)
  - commander, globby
- **Test Structure**: `test/` and `tests/` directories

## Code Style & Conventions
- SOLID principles mandatory
- Object Calisthenics rules (9 rules)
- Clean code, extensible, maintainable
- Classes ≤ 50 lines
- Methods/Functions ≤ 5 lines
- No one-liners
- Logical blocks separated with blank lines
- Early returns
- Use Singleton pattern when applicable
