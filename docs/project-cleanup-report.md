# Project Cleanup Report

Date: 2026-05-09

## Scope

This cleanup pass focused on removing root-level artifacts, tightening generic fixture policy, hiding debug-only controls behind advanced UI, and renaming character-specific test files to archetype/class-based names.

## Files Removed

Root artifacts deleted:

- `Pipkin-actor.json`
- `Pipkin-audit-report.json`
- `Pipkin-debug.json`
- `Pipkin-normalized.json`
- `pipeline-diagnostic-package.json`
- `vite.err.log`
- `vite.out.log`
- `vite-dev.stderr.log`
- `vite-dev.stdout.log`
- `.vite-dev.err.log`
- `.vite-dev.out.log`
- `.dev-logs/`
- `dist/` after validation build

## Files Moved

Generic fixture copy created:

- `samples/Pipkin.xlsx` -> `tests/fixtures/characters/classes/clerigo-level5.bonfire.xlsx`

No runtime code was moved into `src/legacy/` in this pass.

## Files Renamed

Character-specific test and helper filenames were renamed to archetype/class-oriented names.

Cleric / `clerigo-level5` examples:

- `src/tests/createPipkinWorkbook.ts` -> `src/tests/createClerigoLevel5Workbook.ts`
- `src/tests/pipkinFoundryFixture.ts` -> `src/tests/clerigoLevel5FoundryFixture.ts`
- `src/tests/pipkinDescriptions.test.ts` -> `src/tests/clerigoLevel5Descriptions.test.ts`
- `src/tests/pipkinFoundrySkillTotals.test.ts` -> `src/tests/clerigoLevel5FoundrySkillTotals.test.ts`
- `src/tests/pipkinWithMegaLibrary.test.ts` -> `src/tests/clerigoLevel5WithMegaLibrary.test.ts`
- `src/tests/pipkinClericSpellcastingRegression.test.ts` -> `src/tests/clerigoLevel5SpellcastingRegression.test.ts`
- `src/tests/pipkinDiagnosticDevOnly.test.ts` -> `src/tests/sheetDiagnosticDevOnly.test.ts`
- `src/tests/templateAuditPipkin.test.ts` -> `src/tests/templateAuditClerigoLevel5.test.ts`
- `src/tests/templateAuditPipkinNoBlockingErrors.test.ts` -> `src/tests/templateAuditClerigoLevel5NoBlockingErrors.test.ts`
- `src/tests/validatePipkinExport.test.ts` -> `src/tests/validateClerigoLevel5Export.test.ts`
- `src/tests/pipelineAutomationPipkin.test.ts` -> `src/tests/pipelineAutomationClerigoLevel5.test.ts`
- `src/tests/pipelineConsistencyPipkin.test.ts` -> `src/tests/pipelineConsistencyClerigoLevel5.test.ts`
- `src/tests/parsePipkinBonfireLog.test.ts` -> `src/tests/parseBonfireClerigoLevel5LogTemplate.test.ts`
- `src/tests/parsePipkinBonfireV21.test.ts` -> `src/tests/parseBonfireClerigoLevel5V21.test.ts`
- `src/tests/parsePipkinBonfireV21Abilities.test.ts` -> `src/tests/parseBonfireClerigoLevel5V21Abilities.test.ts`
- `src/tests/parsePipkinBonfireV21Movement.test.ts` -> `src/tests/parseBonfireClerigoLevel5V21Movement.test.ts`
- `src/tests/parsePipkinBonfireV21Skills.test.ts` -> `src/tests/parseBonfireClerigoLevel5V21Skills.test.ts`
- `src/tests/parsePipkinFromLogRegion.test.ts` -> `src/tests/parseBonfireClerigoLevel5FromLogRegion.test.ts`
- `src/tests/parsePipkinRealAuditRegression.test.ts` -> `src/tests/parseBonfireClerigoLevel5RealAuditRegression.test.ts`
- `src/tests/parsePipkinSheet.test.ts` -> `src/tests/parseBonfireClerigoLevel5Sheet.test.ts`
- `src/tests/parsePipkinSpells.test.ts` -> `src/tests/parseBonfireClerigoLevel5Spells.test.ts`
- `src/tests/parsePipkinWithRegion.test.ts` -> `src/tests/parseBonfireClerigoLevel5WithRegion.test.ts`
- `src/tests/parsePipkinWrongAuxiliaryRegression.test.ts` -> `src/tests/parseBonfireClerigoLevel5WrongAuxiliaryRegression.test.ts`
- `src/tests/auditPipkin*.test.ts` -> matching `src/tests/auditClerigoLevel5*.test.ts`

Druid / `druida-level6` examples:

- `src/tests/hydrateNannaWithLibrary.test.ts` -> `src/tests/druidaLevel6HydrationWithLibrary.test.ts`
- `src/tests/nannaBonfireFeatureFallback.test.ts` -> `src/tests/druidaLevel6BonfireFeatureFallback.test.ts`
- `src/tests/nannaBonfireFeatureRegression.test.ts` -> `src/tests/druidaLevel6BonfireFeatureRegression.test.ts`
- `src/tests/nannaDruidSpellcasting.test.ts` -> `src/tests/druidaLevel6Spellcasting.test.ts`
- `src/tests/nannaFeatureAliasHydration.test.ts` -> `src/tests/druidaLevel6FeatureAliasHydration.test.ts`
- `src/tests/nannaFeatureNoiseRegression.test.ts` -> `src/tests/druidaLevel6FeatureNoiseRegression.test.ts`
- `src/tests/nannaFeatureQualityRegression.test.ts` -> `src/tests/druidaLevel6FeatureQualityRegression.test.ts`
- `src/tests/nannaFeatureRangesRegression.test.ts` -> `src/tests/druidaLevel6FeatureRangesRegression.test.ts`
- `src/tests/nannaHydrationQualityRegression.test.ts` -> `src/tests/druidaLevel6HydrationQualityRegression.test.ts`
- `src/tests/nannaInitiativeDefault.test.ts` -> `src/tests/druidaLevel6InitiativeDefault.test.ts`
- `src/tests/nannaShieldCollisionRegression.test.ts` -> `src/tests/druidaLevel6ShieldCollisionRegression.test.ts`

## Files Kept

Kept intentionally:

- `fix-foundry-identifiers.mjs`
  - documented utility for already-generated Actor JSONs with invalid identifiers
- `reference-library/README.md`
- `reference-library/.gitkeep`
- `data/bonfire/generated/*.json`
- `data/bonfire/review/*.json`
- `data/bonfire/class-index.json`
- `samples/Fogueira 58 - Mestre Satsuki _ Roll20.pdf`
- `samples/fvtt-Actor-adriel-1fuCNOuindysAgC6.json`

## Functionalities Removed Or Tightened

- Removed root-level debug/export artifacts from the repo working tree.
- Removed visible `PDF fallback` wording from the UI.
- Kept legacy PDF import only inside `Avançado / Debug`.
- Moved debug download actions under `Avançado / Debug`:
  - `Normalized Character JSON`
  - `Diagnostic Package`
- Kept primary export surface focused on:
  - `.xlsx` import
  - Foundry library load
  - Actor JSON export
  - audit/review panels

## Tests Renamed Or Added

Renamed to generic/class coverage naming:

- multiple `Pipkin`-named tests -> `clerigo-level5` variants
- multiple `Nanna`-named tests -> `druida-level6` variants

Added cleanup policy guard:

- `src/tests/projectCleanliness.test.ts`

This test now checks:

- no root-level `Pipkin-*.json`, `Nanna-*.json`, `Johnny-*.json`, `Laplace-*.json`
- no root-level `pipeline-diagnostic*.json`
- no root-level `vite*.log`
- no `PDF fallback` wording in rendered UI
- no `Rodar diagnóstico Pipkin` in rendered UI
- generic fixture presence under `tests/fixtures/characters/classes/`

## .gitignore Additions

Added:

- `.dev-logs/`
- `vite*.log`
- `pipeline-diagnostic*.json`
- `foundry-audit-report*.json`
- `hydration-report*.json`
- `normalized-character*.json`
- `Pipkin-*.json`
- `Nanna-*.json`
- `Johnny-*.json`
- `Laplace-*.json`

Existing keep-rules preserved:

- `!reference-library/.gitkeep`
- `!reference-library/README.md`

## Validation Result

- `npm run bonfire:generate-seeds` passed
- `npm run bonfire:validate-seeds` passed
- `npm run test` passed
- `npm run build` passed

## Notes

- `node_modules/` remains local for development, but is not tracked by Git.
- `dist/` was rebuilt during validation and removed again afterward to keep the root clean.
- Character names may still appear inside real sample workbook content and assertion values where they describe fixture internals, but not in primary test filenames or root export artifacts.
