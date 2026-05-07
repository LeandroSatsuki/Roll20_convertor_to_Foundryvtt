# Foundry Reference Library

A Foundry Reference Library is built from one or more exported Foundry Actor JSON files.

The converter reads only `actor.items`. It ignores `actor.system`, attributes, hit points, AC, spell slots, ownership, folders, and any character state from the source Actor. The spreadsheet remains the source of truth for the final character.

Accepted item types:

- `spell`
- `class`
- `subclass`
- `feat`
- `weapon`
- `equipment`
- `consumable`
- `loot`
- `tool`
- `background`
- `race`

Each accepted item is indexed with its original name, normalized name, type, identifier, source actor, source file, Plutonium flags, dnd5e source id, spell metadata, and quality markers such as activities, effects, Midi-QOL properties, Plutonium flags, compendium source, and description.

Duplicate candidates are preserved. The preferred candidate is selected by item quality, but the library report keeps all entries for review and future manual override.

The UI panel **Biblioteca Foundry** shows loaded files, item counts, and how many items include activities, effects, Midi-QOL, and Plutonium metadata.
