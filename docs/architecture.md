# Architecture

## MVP Flow

PDF -> extracted page text -> parser modules -> NormalizedCharacter -> review UI -> Foundry dnd5e Actor JSON.

Primary Fase 1 flow:

Excel/Google Sheets `.xlsx` -> workbook reader -> sheet anchors -> NormalizedCharacter -> Bonfire Rule Resolver -> review UI -> Foundry dnd5e Actor JSON.

The browser performs all conversion locally. No PDF is uploaded to a server and no OCR or external AI service is used.

## Boundaries

- `src/lib/pdf`: PDF text extraction.
- `src/lib/sheets`: XLSX workbook reading and Bonfire sheet parsing.
- `src/lib/rules`: local Bonfire Rule Store and feature resolution.
- `src/lib/parser`: Roll20 PDF heuristics split by field group.
- `src/lib/normalize`: shared schema and confidence-aware model.
- `src/lib/foundry`: dnd5e 5.2.4 Actor and Item mapping.
- `src/lib/validation`: output validation.
- `src/components`: upload, review, previews, warnings, and downloads.
- `src/lib/r20exporter`: future ZIP/campaign JSON adapter placeholder.

## Future Flow

R20Exporter ZIP/campaign.json -> structured adapter -> NormalizedCharacter or Foundry world/module builder.

That future input should reuse the normalized model where possible while allowing broader campaign entities when world/module export is implemented.
