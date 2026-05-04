# Excel Import

The primary MVP source is now an exported Excel workbook.

Flow:

`.xlsx` -> `SheetCharacterReader` -> `NormalizedCharacter` -> Bonfire rule resolver -> Foundry Actor JSON.

Google Sheets is not fetched online at runtime in this phase. Export the sheet manually:

1. Open the Google Sheets character sheet.
2. Use File -> Download -> Microsoft Excel `.xlsx`.
3. Put it in `/samples` if you want a local sample, for example `/samples/Pipkin.xlsx`.
4. Or upload it manually in the browser.

PDF import remains available as a fallback for older sheets and one-off conversions.

Current limitations:

- The parser uses anchors and relative offsets, not blind absolute coordinates.
- If anchors are missing, parsing continues with warnings.
- The first parser is tuned for the Bonfire visual sheet shape and the Pipkin example fields.
- Direct Google Sheets link import is planned, but not implemented.
- No runtime scraping of World Anvil is performed.
