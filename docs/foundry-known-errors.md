# Foundry Known Errors

## Invalid system.identifier

dnd5e requires Item identifiers to contain only lowercase letters, numbers, dashes, and underscores. The converter blocks export if an identifier is invalid or duplicated.

## Invalid Item Type

dnd5e only accepts known Item document types. The converter currently allows `class`, `subclass`, `race`, `background`, `feat`, `weapon`, `equipment`, `consumable`, `loot`, `spell`, and `tool`. Unknown types are blocking errors.

## Undefined In JSON

Foundry imports can fail unpredictably if exported documents contain `undefined`. The audit scans the Actor and Items before export.

## Invalid Uses Or Recovery

Advanced recovery rules can differ between dnd5e versions. If recovery is uncertain, the converter prefers a textual warning over an invalid automation structure.

## Incomplete Activities

midi-qol and dnd5e may inspect activities more strictly than plain Foundry import. Incomplete activities are warnings; exporting without an activity is safer than exporting broken automation.

## dnd5e vs midi-qol Errors

dnd5e usually rejects invalid document schema, Item types, identifiers, and spell/uses structures. midi-qol may surface additional automation errors for incomplete activities, missing damage workflow data, or malformed action metadata. The converter's audit focuses on preventing import-breaking schema problems first.
