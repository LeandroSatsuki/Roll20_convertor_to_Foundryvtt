# Roll20 to Foundry Converter

External browser app to convert character sheets into a Foundry VTT Actor JSON for the `dnd5e` system.

The primary Fase 1 source is an Excel/Google Sheets `.xlsx` export. PDF import remains available as fallback.

- Upload an exported Google Sheets/Excel `.xlsx`.
- Resolve Bonfire Tales class/race/feature rules from a local seed store.
- Upload a Roll20 PDF fallback.
- Extract text page by page with `pdfjs-dist`.
- Convert the source into `NormalizedCharacter`.
- Review/edit extracted fields.
- Export normalized JSON and Foundry Actor JSON.

No backend, OCR, external AI, Plutonium, 5e.tools, or remote PDF upload is used.

## Requirements

- Node.js 20+.
- npm.

## Install

```bash
npm install
```

## Run

```bash
npm run dev
npm run test
npm run build
```

## Samples

Place example files in `/samples`:

- `samples/Fogueira 58 - Mestre Satsuki _ Roll20.pdf`
- `samples/fvtt-Actor-adriel-1fuCNOuindysAgC6.json`

The Adriel Actor export is used only as a structural reference for Foundry core `13.351`, system `dnd5e`, system version `5.2.4`. IDs from that sample are not copied.

## Using The App

1. Start the dev server with `npm run dev`.
2. Open the local Vite URL.
3. Upload an exported `.xlsx`, or use PDF fallback.
4. Review highlighted medium/low confidence fields.
5. Review the feature resolution table.
6. Download `JSON normalizado` or `Actor Foundry`.
7. In Foundry VTT, import the Actor JSON from the Actors directory.

## Scope

The current priority is `.xlsx` input:

Excel/Google Sheets `.xlsx` -> NormalizedCharacter -> Bonfire rules -> Foundry Actor JSON.

PDF fallback remains available:

PDF -> text -> NormalizedCharacter -> review -> Foundry Actor JSON.

Future R20Exporter support is planned as a separate optional input:

R20Exporter ZIP/campaign.json -> NormalizedCharacter or Foundry World/Module.

R20Exporter and R20Converter are external references, not dependencies. Any future R20Exporter support should be used only with campaigns you own/control and in compliance with Roll20 terms and marketplace content licenses.

## Foundry dnd5e Compatibility Rule

Every exported Item must have a valid `system.identifier`. The identifier is not the displayed name: `item.name` may keep Portuguese text, spaces, accents, and symbols, but `system.identifier` must contain only lowercase `a-z`, numbers `0-9`, dashes, and underscores.

Example:

```json
{
  "name": "Retomar Fôlego",
  "system": {
    "identifier": "retomar-folego"
  }
}
```

If any Item identifier is invalid, Actor export is blocked.

## Fixing An Existing Export

```bash
node fix-foundry-identifiers.mjs ficha-gerada.json ficha-corrigida.json
```

## Documentation

- `docs/architecture.md`
- `docs/mapping-roll20-to-foundry.md`
- `docs/r20converter-reference.md`
- `docs/r20exporter-future-support.md`
- `docs/known-limitations.md`
- `docs/excel-import.md`
- `docs/bonfire-rules-architecture.md`
- `docs/feature-resolution.md`
