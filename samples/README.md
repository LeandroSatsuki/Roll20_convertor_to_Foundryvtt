# Samples

This folder contains small sample inputs used by parser and export regression tests.

`Pipkin.xlsx` is currently required by the automated sheet-import regression tests. To test a private character sheet locally without committing it, export the character sheet from Excel/Google Sheets as `.xlsx` and place it in this folder using a local-only filename or update the tests to point at your local fixture.

Do not commit new private campaign exports, personal character sheets, logs, or generated Foundry exports unless they are intentionally sanitized fixtures.
