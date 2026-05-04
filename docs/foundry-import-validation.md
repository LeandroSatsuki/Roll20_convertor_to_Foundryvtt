# Foundry Import Validation

Before exporting Actor JSON, the app builds a Foundry audit report for Foundry VTT v13 and dnd5e 5.2.4.

Validated areas:

- Actor root shape: name, type, system, items, effects, prototypeToken, and `_stats`.
- Abilities, saves, skills, HP, AC, movement, senses, spellcasting ability.
- Spell slot structure from `spell1` through `spell9`.
- Item `_id`, `name`, `type`, `system`, `system.identifier`, flags, uses, activities, and undefined values.
- Duplicate item identifiers.
- Equipment and weapon export safety.

Blocking errors disable Actor JSON download:

- Missing `actor.system`.
- `undefined` anywhere in the exported JSON object.
- Invalid or duplicate `system.identifier`.
- Item missing `name` or `type`.
- Clearly invalid item type.
- Invalid spell slot structure.

Non-blocking warnings still allow export:

- Unknown feature resolution.
- Incomplete descriptions.
- Missing activities.
- Unknown recovery text.
- Generic feat/equipment fallback.

Use the `Audit Report` download to inspect every validation result and review warnings before importing into Foundry.
