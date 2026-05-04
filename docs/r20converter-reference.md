# R20Converter Reference

Source reviewed: https://github.com/kakaroto/R20Converter

## What It Does

R20Converter is a desktop application for Windows, macOS, and Linux that converts a Roll20 campaign exported by R20Exporter into a Foundry VTT world or module. Its README describes an end-to-end campaign conversion flow: select an exported ZIP or JSON, choose an output directory, then generate a Foundry-ready world folder.

It has entity-oriented modules for actors, items, journals, scenes, folders, playlists, rollable tables, macros, combat, settings, and users. That separation is the most useful architectural lesson for this project.

## What It Does Not Do

R20Converter does not convert printed Roll20 character PDFs. It expects a structured campaign export from R20Exporter, not visual sheet text. It also does not support arbitrary Roll20 character sheets: the README calls out the Roll20 D&D 5e OGL sheet and the Shaped Sheet as supported character conversion paths.

## Input Flow

The input is a R20Exporter ZIP or a campaign JSON. The converter can read the ZIP directly without requiring the user to extract it first. The ZIP/campaign JSON contains structured campaign data and asset references, which is fundamentally different from parsing a printed PDF.

## Foundry Output Flow

R20Converter writes a Foundry world or module folder. That means it handles more than one Actor: it can generate scenes, journals, playlists, tables, macros, permissions, and related world files. The MVP here deliberately stops at an external browser app that exports a single dnd5e Actor JSON.

## Ideas To Reuse Conceptually

- Keep input adapters separate from Foundry mappers.
- Convert into an intermediate model before producing Foundry output.
- Organize conversion by entity type instead of one large parser.
- Preserve unsupported data in fallback notes rather than dropping it.
- Treat world/module generation as a later output target, not part of PDF parsing.

## What Must Not Be Copied

No source code, templates, conversion tables, or implementation details should be copied from R20Converter. This project uses it only as architecture research. The PDF parser and Foundry v13/dnd5e 5.2.4 mapper are implemented from scratch.

## GPLv3 Risk

R20Converter is GPLv3. Copying or adapting its code could make this project a derivative work and trigger GPLv3 obligations. Until the project explicitly chooses that licensing path, keep the implementation clean-room: document ideas, do not import code.

## Version Gap

R20Converter was built around older Foundry and dnd5e versions. This project targets Foundry core 13.351 and dnd5e 5.2.4, using the exported Adriel Actor sample as the current output reference. The dnd5e system has changed item, activity, uses, spell, and actor data structures over time, so legacy assumptions should not be treated as authoritative.
