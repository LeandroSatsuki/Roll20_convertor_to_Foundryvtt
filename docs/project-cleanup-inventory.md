# Project Cleanup Inventory

Generated on Phase 0.12 as a living inventory for cleanup and generalization.

## Local Bonfire Sources

- Local HTML files were found under `data/HTML BONFIRE/`.
- The builder accepts that path and does not perform live scraping.
- `data/HTML BONFIRE/` is intentionally ignored by Git because the saved World Anvil export includes large support asset folders.

## Obsolete Or Dev-Facing UI

- `src/components/SourceImportPanel.tsx` still keeps PDF fallback behind `Avançado / Debug`.
- `src/components/DownloadButtons.tsx` exposes Normalized Character and Diagnostic Package downloads. These are debug artifacts and should remain outside the primary user path.
- `src/components/SheetParseDebugPanel.tsx` is still valid, but it belongs in advanced/debug UI.
- Main navigation should prioritize XLSX import, Foundry library upload, audit/export readiness, detected features, hydration, and final Actor JSON. Debug JSON and raw PDF text belong in advanced UI only.

## Legacy PDF Code

- `src/lib/pdf/`
- `src/lib/parser/`
- PDF flow is isolated behind advanced/debug UI and should not drive Bonfire XLSX behavior.

## Character-Specific Test Names To Generalize

These tests still preserve useful regressions, but their filenames are character-specific and should be renamed toward class/archetype coverage over time:

- `parsePipkin*.test.ts`
- `auditPipkin*.test.ts`
- `pipkin*.test.ts`
- `nanna*.test.ts`
- `hydrateNannaWithLibrary.test.ts`

Current policy: do not add new main test files named after a character. Existing tests should be migrated as their coverage is replaced by class fixtures and class coverage tests.

## Character-Specific Fixtures To Generalize

- `src/tests/createPipkinWorkbook.ts`
- `src/tests/pipkinFoundryFixture.ts`
- `samples/Pipkin.xlsx`

## Generated Files That Should Not Go To Git

- `dist/`
- `node_modules/`
- `.env`
- `reference-library/*.json`
- `data/HTML BONFIRE/`
- ad hoc exported actor/debug/audit JSON files at repo root

## Generated Files That Are Intended For Review

- `data/bonfire/generated/*.seed.json`
- `data/bonfire/review/*.json`

## Source Markers And Debug Strings To Review Later

Search terms used for this inventory:

- `Pipkin`
- `Nanna`
- `Johnny`
- `Roll20 PDF`
- `diagnostic Pipkin`
- `fallback PDF`
- `sourceCodeMarker`
- `temporary`
- `TODO`
- `FIXME`
- `debug only`

The cleanup target is to keep source markers technical and versioned, but not character-specific.

## Bonfire Description Fidelity

- Legacy manual Bonfire seeds still exist for coverage gaps and should be treated as `needs-review` or `summary-only` unless their text is verified against local Bonfire HTML.
- Card/list summary text must never be marked as complete rule text.
- Missing full rule pages should be tracked in `data/bonfire/review/needs-review.json` and `data/bonfire/review/source-index.json`, not patched per character.
