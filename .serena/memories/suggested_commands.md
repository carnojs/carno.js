# Suggested Commands

## Development Commands

### Building
```bash
npm run build          # Build TypeScript (all packages)
npm run compile       # Alias for build
npm run lint          # Type check with TypeScript
```

### Testing
```bash
npm test              # Run all tests using Bun
npm run pretest       # Start Docker containers (auto-runs before tests)
npm run posttest      # Stop Docker containers (auto-runs after tests)
```

### Windows System Commands
- `dir` or `ls`: List files/directories
- `cd`: Change directory
- `tasklist`: List running processes
- `taskkill /F /PID`: Kill process by PID
- `Select-String`: Pattern searching in PowerShell

## Database
- PostgreSQL runs in Docker
- Test database: `pg_test`
- Auto-setup via docker-compose before tests

## Important Notes
- All changes must maintain zero errors in:
  - Tests
  - Build/compilation
  - Linting
- CLAUDE.md contains strict AI code generation rules that must be followed
