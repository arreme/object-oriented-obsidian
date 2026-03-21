# Copilot Instructions for Object Oriented Obsidian

## Purpose
This repository is an Obsidian plugin that enforces note consistency through:
- YAML frontmatter validation for configured note folders
- Object creation from user-defined templates

Read [README.md](../README.md) for product-level context. Keep this file focused on contributor and agent execution behavior.

## Build and Validation Commands
Use these commands during normal development:
- Install dependencies: npm install
- Development watch build: npm run dev
- Production build and TypeScript checks: npm run build
- Release version sync: npm run version
- Clean build artifacts: npm run clean

Before opening a PR or finalizing a change, run:
1. npm run build

Notes:
- There is no dedicated test suite in this repo yet.
- Type safety is enforced mostly through TypeScript compiler options.

## Architecture Map
- Entry point: [src_ts/main.ts](../src_ts/main.ts)
- Commands:
  - [src_ts/Commands/create_object.ts](../src_ts/Commands/create_object.ts)
  - [src_ts/Commands/validate_types.ts](../src_ts/Commands/validate_types.ts)
- Settings UI and data:
  - [src_ts/Settings/settings.ts](../src_ts/Settings/settings.ts)
  - [src_ts/Settings/config_data.ts](../src_ts/Settings/config_data.ts)
  - [src_ts/Settings/abstract_suggester.ts](../src_ts/Settings/abstract_suggester.ts)
- Build config: [esbuild.config.mjs](../esbuild.config.mjs)
- Plugin metadata: [manifest.json](../manifest.json)
- Version sync script: [version-bump.mjs](../version-bump.mjs)

## Project Conventions

### Obsidian plugin patterns
- Keep plugin wiring in [src_ts/main.ts](../src_ts/main.ts) focused on command registration and settings tab setup.
- Keep business logic in command classes under [src_ts/Commands/](../src_ts/Commands/).
- Use constructor injection of Obsidian App in handlers.
- Use Notice for user-facing feedback.

### Settings and persistence
- Add new user configuration fields to ValidationPluginSettings in [src_ts/Settings/config_data.ts](../src_ts/Settings/config_data.ts).
- Include sensible defaults in DEFAULT_SETTINGS.
- Persist settings with plugin saveSettings and loadSettings flow in [src_ts/main.ts](../src_ts/main.ts).

### Paths and vault operations
- Normalize user-entered folder paths in settings using normalizePath.
- Use vault APIs and fileManager APIs consistently with existing patterns.
- Prefer explicit guards and early returns for missing files, missing templates, and invalid config.

## Frontmatter Validation Rules
Validation behavior in [src_ts/Commands/validate_types.ts](../src_ts/Commands/validate_types.ts):
- Template frontmatter drives required key order.
- Top-level key order is enforced.
- Nested YAML and list item lines are intentionally ignored when extracting key order.
- Missing keys in notes are filled from template values.

If you change this behavior, update README documentation accordingly.

## Build and Runtime Constraints
- Bundle output is main.js in CommonJS format via esbuild.
- Obsidian and CodeMirror packages are externalized in [esbuild.config.mjs](../esbuild.config.mjs).
- Keep compatibility with minAppVersion in [manifest.json](../manifest.json).
- For releases, ensure package.json and manifest.json versions are synchronized through npm run version.

## Change Checklist for Agents
1. Keep edits scoped to the relevant command/settings module.
2. If changing settings schema, update both interface and defaults.
3. If changing command behavior, verify command registration and call flow from [src_ts/main.ts](../src_ts/main.ts).
4. Run npm run build and resolve all errors.
5. If release metadata is touched, run npm run version and verify [manifest.json](../manifest.json) and [versions.json](../versions.json).

## Documentation Strategy
Use links rather than duplicating details:
- Product usage and setup: [README.md](../README.md)
- Plugin metadata and compatibility: [manifest.json](../manifest.json)
- Build configuration details: [esbuild.config.mjs](../esbuild.config.mjs)

If the repository grows, add area-specific instruction files with applyTo patterns for:
- src_ts/Commands/**
- src_ts/Settings/**
- release/versioning files
