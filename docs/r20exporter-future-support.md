# R20Exporter Future Support

Source reviewed: https://github.com/kakaroto/R20Exporter

## What R20Exporter Produces

R20Exporter is a Chrome extension that exports a Roll20 campaign and its assets into a ZIP file. The extension adds an export control inside a Roll20 campaign and generates the archive locally in the browser.

## Why It Matters

The ZIP or `campaign.json` is a more reliable future input than a printed PDF because it can preserve structured character, journal, scene, table, macro, and asset data. PDF parsing is necessarily heuristic; campaign JSON parsing can become a stronger adapter.

## MVP Boundary

R20Exporter support is not implemented in the MVP. The MVP focuses on:

- Roll20 PDF upload.
- Text extraction in the browser.
- NormalizedCharacter review.
- Foundry dnd5e Actor JSON export.

The `/src/lib/r20exporter` folder only reserves the future boundary for ZIP and campaign JSON adapters.

## Optional Future Flow

Future phases may support:

- `campaign.json` -> `NormalizedCharacter[]`.
- R20Exporter ZIP -> campaign data plus assets.
- Foundry module/world generation.
- Multiple Actors, handouts/journals, scenes, playlists, and assets.

## Usage Warning

Any future R20Exporter support must remain optional and include a clear notice: use it only with campaigns you own/control and respect Roll20 terms, marketplace licenses, and content ownership rules. R20Exporter itself documents similar caution for backup/archiving of owned campaigns.
